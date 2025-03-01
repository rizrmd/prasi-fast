import type {
  BaseRecord,
  WorkflowModelBase,
} from "../../../workflow/workflow-manager";
import type { User } from "@prisma/client";
import type { WorkflowConfig } from "../../../workflow/types";
import { workflowRegistry } from "../../../workflow/workflow-registry";

export interface WorkflowState {
  currentUser: User | null;
  config: { name: string; [key: string]: any };
  workflowManager?: any;
  workflowConfig?: WorkflowConfig;
}

export class ModelWorkflow<T extends WorkflowModelBase> {
  protected state!: WorkflowState;

  /**
   * Initialize workflow for this model
   */
  protected async initializeWorkflow(config: WorkflowConfig) {
    if (!this.state.workflowConfig) {
      this.state.workflowConfig = config;
      // this.state.workflowManager = workflowRegistry.getManager();
      workflowRegistry.registerWorkflow(this.state.config.name, config);
    }
  }

  /**
   * Check if workflow exists for this model
   */
  protected hasWorkflow(): boolean {
    return workflowRegistry.hasWorkflow(this.state.config.name);
  }

  /**
   * Get workflow manager instance
   */
  protected getWorkflowManager() {
    return this.state.workflowManager;
  }

  /**
   * Get available actions for a role
   */
  protected async getAvailableActions(role: string): Promise<
    {
      name: string;
      status?: string;
    }[]
  > {
    if (!this.hasWorkflow()) return [];
    return this.getWorkflowManager().getAvailableActions(
      this.state.config.name,
      (this.state as any).data?.state || "active", // Cast needed for record state
      role
    );
  }

  /**
   * Check if an action can be performed
   */
  protected async canPerformAction(
    role: string,
    action: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    if (!this.hasWorkflow() || !(this.state as any).data) {
      return { allowed: false, reason: "No workflow or record" };
    }

    return this.getWorkflowManager().canPerformAction(
      (this.state as any).data,
      this.state.config.name,
      role,
      action
    );
  }

  /**
   * Get editable fields for current state/role
   */
  protected async getFieldConfig(
    role: string
  ): Promise<
    Record<string, boolean> | { _all: true; _except: string[] } | null
  > {
    if (!this.hasWorkflow() || !(this.state as any).data) return null;

    return this.getWorkflowManager().getFieldConfig(
      this.state.config.name,
      (this.state as any).data.state,
      role
    );
  }

  /**
   * Perform a workflow action
   */
  protected async performAction(
    role: string,
    action: string,
    userId: string,
    comment?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.hasWorkflow() || !(this.state as any).data) {
      return { success: false, error: "No workflow or record" };
    }

    return this.getWorkflowManager().performAction(
      (this.state as any).data,
      this.state.config.name,
      role,
      action,
      userId,
      comment
    );
  }

  /**
   * Get workflow audit logs
   */
  protected async getWorkflowLogs(): Promise<any[]> {
    if (!this.hasWorkflow() || !(this.state as any).data) return [];

    return this.getWorkflowManager().getAuditLogs(
      this.state.config.name,
      (this.state as any).data.id
    );
  }

  /**
   * Validate workflow update permissions
   */
  protected async validateWorkflowUpdate(
    role: string,
    data: Partial<T>
  ): Promise<{ allowed: boolean; reason?: string }> {
    if (!this.hasWorkflow() || !(this.state as any).data) {
      return { allowed: true }; // No workflow = no restrictions
    }

    const fields = await this.getFieldConfig(role);
    if (!fields) return { allowed: true };

    if ("_all" in fields && Array.isArray(fields._except)) {
      const nonEditableFields = fields._except;
      const hasNonEditableFields = Object.keys(data).some((field) =>
        nonEditableFields.includes(field)
      );
      if (hasNonEditableFields) {
        return {
          allowed: false,
          reason: `Cannot modify restricted fields: ${nonEditableFields.join(
            ", "
          )}`,
        };
      }
    } else if (!("_all" in fields)) {
      const nonEditableFields = Object.keys(data).filter(
        (field) => !fields[field]
      );
      if (nonEditableFields.length > 0) {
        return {
          allowed: false,
          reason: `Cannot modify fields: ${nonEditableFields.join(", ")}`,
        };
      }
    }

    return { allowed: true };
  }
}
