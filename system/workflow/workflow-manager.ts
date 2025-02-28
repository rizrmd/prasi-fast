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

// Default service implementations 
class DefaultNotificationService implements NotificationService {
  async sendNotification(to: { type: string; value?: string }, template: string, data: Record<string, any>) {
    try {
      if (!to.type) {
        throw new Error('Notification target type is required');
      }
      if (template.trim().length === 0) {
        throw new Error('Notification template is required');
      }
      console.log(`[Notification] Template: ${template}`);
      console.log(`[Notification] To: ${to.type}:${to.value || 'N/A'}`);
      console.log(`[Notification] Data:`, data);
    } catch (error: any) {
      console.error('[Notification Error]', error.message);
      throw error;
    }
  }
}

class DefaultValidationService implements ValidationService {
  async validateAction(validationPath: string, data: any): Promise<boolean> {
    try {
      if (!validationPath) {
        throw new Error('Validation path is required');
      }
      console.log(`[Validation] Path: ${validationPath}`);
      console.log(`[Validation] Data:`, data);
      return true;
    } catch (error: any) {
      console.error('[Validation Error]', error.message);
      throw error;
    }
  }
}

class DefaultProcessService implements ProcessService {
  async runProcess(processPath: string, data: any): Promise<void> {
    try {
      if (!processPath) {
        throw new Error('Process path is required');
      }
      console.log(`[Process] Path: ${processPath}`);
      console.log(`[Process] Data:`, data);
    } catch (error: any) {
      console.error('[Process Error]', error.message);
      throw error;
    }
  }
}

export class WorkflowManager {
  private static instance: WorkflowManager;
  private workflows: Map<string, WorkflowConfig> = new Map();
  protected notificationService: NotificationService;
  protected validationService: ValidationService;
  protected processService: ProcessService;
  private auditLogs: WorkflowLog[] = [];

  private constructor(
    notificationService: NotificationService = new DefaultNotificationService(),
    validationService: ValidationService = new DefaultValidationService(),
    processService: ProcessService = new DefaultProcessService()
  ) {
    this.notificationService = notificationService;
    this.validationService = validationService;
    this.processService = processService;
  }

  public static getInstance(): WorkflowManager {
    if (!WorkflowManager.instance) {
      WorkflowManager.instance = new WorkflowManager();
    }
    return WorkflowManager.instance;
  }

  /**
   * Update service implementations
   */
  public setServices(
    notificationService?: NotificationService,
    validationService?: ValidationService,
    processService?: ProcessService
  ): void {
    if (notificationService) this.notificationService = notificationService;
    if (validationService) this.validationService = validationService;
    if (processService) this.processService = processService;
  }

  /**
   * Register a workflow configuration
   */
  public registerWorkflow(modelName: string, config: WorkflowConfig): void {
    this.workflows.set(modelName, config);
  }

  /**
   * Get workflow configuration
   */
  public getWorkflow(modelName: string): WorkflowConfig | undefined {
    return this.workflows.get(modelName);
  }

  /**
   * Check if a model has a workflow configuration
   */
  public hasWorkflow(modelName: string): boolean {
    return this.workflows.has(modelName);
  }

  /**
   * Get all registered workflows
   */
  public getAllWorkflows(): Record<string, WorkflowConfig> {
    return Object.fromEntries(this.workflows.entries());
  }

  /**
   * Get workflow configuration for a model
   */
  private getWorkflowForModel(modelName: string): WorkflowConfig | null {
    return (
      this.workflows.get(modelName) || null
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
    try {
      const canPerform = await this.canPerformAction(model, modelName, role, action);
      if (!canPerform.allowed) {
        return { success: false, error: canPerform.reason };
      }

      const actions = this.getAvailableActions(modelName, model.state, role);
      const actionConfig = actions.find(a => a.name === action);
      if (!actionConfig) {
        return { success: false, error: "Action not found" };
      }

      // Update state if specified
      if (actionConfig.status) {
        model.state = actionConfig.status;
      }

      // Process triggers
      if (actionConfig.trigger) {
        try {
          await this.processTriggers(actionConfig.trigger, model);
        } catch (error: any) {
          const message = error?.message || 'Failed to process triggers';
          return { success: false, error: `Trigger processing failed: ${message}` };
        }
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
        changes: {} // TODO: Track actual changes
      });

      return { success: true };
    } catch (error: any) {
      const message = error?.message || 'Unknown error occurred';
      return { success: false, error: `Action failed: ${message}` };
    }
  }

  /**
   * Process workflow triggers
   */
  private async processTriggers(trigger: Trigger, model: WorkflowModelBase): Promise<void> {
    // Process notifications
    if (trigger.notify) {
      for (const notification of trigger.notify) {
        try {
          const to = notification.to;
          const data = this.resolveTemplateData(notification.data || {}, model);
          await this.notificationService.sendNotification(to, notification.template, data);
        } catch (error: any) {
          console.error('Notification failed:', error);
          // Continue with other notifications even if one fails
        }
      }
    }

    // Process calculations
    if (trigger.calculate) {
      try {
        await this.processService.runProcess(trigger.calculate, model);
      } catch (error: any) {
        throw new Error(`Calculation failed: ${error.message}`);
      }
    }

    // Process approvals
    if (trigger.approval) {
      const requiresApproval = !trigger.approval.required_if || 
        await this.validationService.validateAction(trigger.approval.required_if, model);
      
      if (requiresApproval) {
        for (const step of trigger.approval.steps) {
          try {
            // Create approval task
            await this.createApprovalTask(model, step);
          } catch (error: any) {
            throw new Error(`Failed to create approval task: ${error.message}`);
          }
        }
      }
    }

    // Process updates
    if (trigger.update) {
      try {
        Object.assign(model, trigger.update);
      } catch (error: any) {
        throw new Error(`Failed to apply updates: ${error.message}`);
      }
    }

    // Process creation triggers
    if (trigger.create) {
      try {
        await this.processService.runProcess('create', { ...trigger.create, sourceModel: model });
      } catch (error: any) {
        throw new Error(`Creation process failed: ${error.message}`);
      }
    }
  }

  private resolveTemplateData(template: Record<string, string>, model: WorkflowModelBase): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, path] of Object.entries(template)) {
      result[key] = this.getValueByPath(model, path);
    }
    return result;
  }

  private getValueByPath(obj: any, path: string): any {
    return path.split('.').reduce((current, part) => current?.[part], obj);
  }

  private async createApprovalTask(model: WorkflowModelBase, step: { role: string; timeout?: string; comment_required?: boolean }): Promise<void> {
    // Implementation would depend on how tasks are managed in the system
    // This is a placeholder that would need to be implemented based on the actual task management system
    console.log('Creating approval task:', {
      modelId: model.id,
      role: step.role,
      timeout: step.timeout,
      requiresComment: step.comment_required
    });
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
