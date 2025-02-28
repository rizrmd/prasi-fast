import type { WorkflowConfig, ActionConfig, Trigger, StateConfig } from "./types";

export interface WorkflowLog {
  modelName: string;
  modelId: string | number;
  state: string;
  action?: string;
  role: string;
  userId: string;
  timestamp: Date;
  comment?: string;
  changes?: Record<string, any>;
}

export interface BaseRecord {
  id: string | number;
  created_at: Date;
  updated_at: Date;
  [key: string]: any;
}

// Add string indexing to allow dynamic field access
export interface WorkflowModelBase extends BaseRecord {
  state: string;
  [key: string]: any;
}

export interface NotificationService {
  sendNotification(to: { type: string; value?: string }, template: string, data: Record<string, any>): Promise<void>;
}

export interface ValidationService {
  validateAction(validationPath: string, data: any): Promise<boolean>;
}

export interface ProcessService {
  runProcess(processPath: string, data: any): Promise<void>;
}

export class WorkflowManager {
  private workflows: Record<string, WorkflowConfig>;
  protected notificationService: NotificationService;
  protected validationService: ValidationService;
  protected processService: ProcessService;
  private auditLogs: WorkflowLog[] = [];

  constructor(
    workflows: Record<string, WorkflowConfig>,
    notificationService: NotificationService,
    validationService: ValidationService,
    processService: ProcessService
  ) {
    this.workflows = workflows;
    this.notificationService = notificationService;
    this.validationService = validationService;
    this.processService = processService;
  }

  // Re-expose services for registry
  public getNotificationService(): NotificationService {
    return this.notificationService;
  }

  public getValidationService(): ValidationService {
    return this.validationService;
  }

  public getProcessService(): ProcessService {
    return this.processService;
  }

  /**
   * Register a new workflow configuration
   */
  registerWorkflow(modelName: string, config: WorkflowConfig): void {
    this.workflows[modelName] = config;
  }

  /**
   * Check if a model has an associated workflow
   */
  hasWorkflow(modelName: string): boolean {
    return Object.values(this.workflows).some(
      workflow => workflow.models[modelName] != null
    );
  }

  /**
   * Get workflow configuration for a model
   */
  private getWorkflowForModel(modelName: string): WorkflowConfig | null {
    return (
      Object.values(this.workflows).find(
        workflow => workflow.models[modelName] != null
      ) || null
    );
  }

  /**
   * Get state configuration for a model
   */
  private getStateConfig(modelName: string, state: string): StateConfig | null {
    const workflow = this.getWorkflowForModel(modelName);
    return workflow?.models[modelName]?.flow[state] || null;
  }

  /**
   * Get available actions for a role in a specific state
   */
  getAvailableActions(
    modelName: string,
    state: string,
    role: string
  ): (ActionConfig & { name: string })[] {
    const stateConfig = this.getStateConfig(modelName, state);
    if (!stateConfig) return [];

    const roleConfig = stateConfig[role];
    if (!roleConfig || typeof roleConfig === "string") return [];

    return Object.entries(roleConfig.actions || {})
      .filter(([_, action]) => {
        // Check if action is allowed for role
        if (action.roles && !action.roles.includes(role)) {
          return false;
        }
        return true;
      })
      .map(([name, config]) => ({
        name,
        ...config,
      })) as (ActionConfig & { name: string })[];
  }

  /**
   * Get field configuration for current state and role
   */
  getFieldConfig(
    modelName: string,
    state: string,
    role: string
  ): ({ _all: true; _except: string[] } | Record<string, boolean> | null) {
    const stateConfig = this.getStateConfig(modelName, state);
    if (!stateConfig) return null;

    const roleConfig = stateConfig[role];
    if (!roleConfig || typeof roleConfig === "string") return null;

    const fieldConfig = roleConfig.fields;
    if (!fieldConfig) return null;

    if (fieldConfig.editable?.all) {
      return {
        _all: true,
        _except: fieldConfig.editable.except || [],
      };
    }

    // Build field map for individual field access
    const editableFields: Record<string, boolean> = {};
    if (fieldConfig.editable?.except) {
      fieldConfig.editable.except.forEach(field => {
        editableFields[field] = true;
      });
    }

    return editableFields;
  }

  /**
   * Check if an action can be performed
   */
  async canPerformAction(
    model: WorkflowModelBase,
    modelName: string,
    role: string,
    action: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    const actions = this.getAvailableActions(modelName, model.state, role);
    const actionConfig = actions.find(a => a.name === action);

    if (!actionConfig) {
      return { allowed: false, reason: "Action not found" };
    }

    // Validate required fields
    if (actionConfig.fields?.required) {
      for (const field of actionConfig.fields.required) {
        if (!model[field]) {
          return { allowed: false, reason: `Missing required field: ${field}` };
        }
      }
    }

    // Run validation if specified
    if (actionConfig.validate) {
      try {
        const isValid = await this.validationService.validateAction(
          actionConfig.validate,
          model
        );
        if (!isValid) {
          return { allowed: false, reason: "Validation failed" };
        }
      } catch (error: any) {
        const message = error?.message || 'Unknown validation error';
        return { allowed: false, reason: `Validation error: ${message}` };
      }
    }

    return { allowed: true };
  }

  /**
   * Perform a workflow action
   */
  async performAction(
    model: WorkflowModelBase,
    modelName: string,
    role: string,
    action: string,
    userId: string,
    comment?: string
  ): Promise<{ success: boolean; error?: string }> {
    const canPerform = await this.canPerformAction(model, modelName, role, action);
    if (!canPerform.allowed) {
      return { success: false, error: canPerform.reason };
    }

    const actions = this.getAvailableActions(modelName, model.state, role);
    const actionConfig = actions.find(a => a.name === action);
    if (!actionConfig) {
      return { success: false, error: "Action not found" };
    }

    try {
      // Update state if specified
      if (actionConfig.status) {
        model.state = actionConfig.status;
      }

      // Log the action
      this.logWorkflowChange({
        modelName,
        modelId: model.id,
        state: model.state,
        action,
        role,
        userId,
        timestamp: new Date(),
        comment,
        changes: { status: actionConfig.status }
      });

      // Process triggers
      if (actionConfig.trigger) {
        await this.processTriggers(actionConfig.trigger, model);
      }

      return { success: true };
    } catch (error: any) {
      const message = error?.message || 'Unknown error';
      return { success: false, error: message };
    }
  }

  /**
   * Process workflow triggers
   */
  private async processTriggers(trigger: Trigger, model: WorkflowModelBase): Promise<void> {
    if (trigger.notify) {
      for (const notification of trigger.notify) {
        const value = notification.to.field ? model[notification.to.field] : notification.to.value;
        if (value) {
          await this.notificationService.sendNotification(
            { type: notification.to.type, value },
            notification.template,
            notification.data || {}
          );
        }
      }
    }

    if (trigger.process) {
      await this.processService.runProcess(trigger.process, model);
    }
  }

  /**
   * Log a workflow state change
   */
  private logWorkflowChange(log: WorkflowLog): void {
    this.auditLogs.push(log);
  }

  /**
   * Get workflow audit logs
   */
  getAuditLogs(modelName: string, modelId: string | number): WorkflowLog[] {
    return this.auditLogs.filter(
      log => log.modelName === modelName && log.modelId === modelId
    );
  }
}
