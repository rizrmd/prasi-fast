import type { WorkflowConfig } from "../workflow/types";

/**
 * Registry to manage workflow configurations for models
 */
export class WorkflowRegistry {
  private static instance: WorkflowRegistry;
  private workflows: Map<string, WorkflowConfig> = new Map();

  private constructor() {}

  public static getInstance(): WorkflowRegistry {
    if (!WorkflowRegistry.instance) {
      WorkflowRegistry.instance = new WorkflowRegistry();
    }
    return WorkflowRegistry.instance;
  }

  /**
   * Register a workflow configuration for a model
   */
  public registerWorkflow(modelName: string, config: WorkflowConfig): void {
    this.workflows.set(modelName, config);
  }

  /**
   * Get workflow configuration for a model
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
}

// Export singleton instance
export const workflowRegistry = WorkflowRegistry.getInstance();
