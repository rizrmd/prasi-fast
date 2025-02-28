import type { WorkflowConfig } from "./types";
import { WorkflowManager, NotificationService, ValidationService, ProcessService } from "./workflow-manager";

// Default service implementations 
class DefaultNotificationService implements NotificationService {
  async sendNotification(to: { type: string; value?: string }, template: string, data: Record<string, any>) {
    console.log(`Notification: ${template} to ${to.type}:${to.value}`, data);
  }
}

class DefaultValidationService implements ValidationService {
  async validateAction(validationPath: string, data: any): Promise<boolean> {
    console.log(`Validating ${validationPath}`);
    return true;
  }
}

class DefaultProcessService implements ProcessService {
  async runProcess(processPath: string, data: any): Promise<void> {
    console.log(`Running process ${processPath}`, data);
  }
}

// Keep current service instances
const defaultServices = {
  notification: new DefaultNotificationService(),
  validation: new DefaultValidationService(),
  process: new DefaultProcessService(),
};

/**
 * Registry to manage workflow configurations and instance
 */
export class WorkflowRegistry {
  private static instance: WorkflowRegistry;
  private workflows: Map<string, WorkflowConfig> = new Map();
  private manager: WorkflowManager;
  private services = defaultServices;

  private constructor() {
    this.manager = new WorkflowManager(
      {},
      this.services.notification,
      this.services.validation,
      this.services.process
    );
  }

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
    // Create new manager instance with updated workflows
    this.manager = new WorkflowManager(
      this.getAllWorkflows(),
      this.services.notification,
      this.services.validation,
      this.services.process
    );
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

  /**
   * Get the workflow manager instance
   */
  public getManager(): WorkflowManager {
    return this.manager;
  }

  /**
   * Update service implementations
   */
  public setServices(
    notificationService?: NotificationService,
    validationService?: ValidationService,
    processService?: ProcessService
  ): void {
    // Update services
    if (notificationService) this.services.notification = notificationService;
    if (validationService) this.services.validation = validationService;
    if (processService) this.services.process = processService;

    // Create new manager with updated services
    this.manager = new WorkflowManager(
      this.getAllWorkflows(),
      this.services.notification,
      this.services.validation,
      this.services.process
    );
  }
}

// Export singleton instance
export const workflowRegistry = WorkflowRegistry.getInstance();
