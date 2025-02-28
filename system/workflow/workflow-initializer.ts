import { workflowRegistry } from "./workflow-registry";
import type { NotificationService, ValidationService, ProcessService } from "./workflow-manager";
import pembelianWorkflow from "../../shared/workflows/pembelian";

/**
 * Initialize default services
 * This should be called during app startup
 */
export function initializeWorkflowServices(
  notificationService?: NotificationService,
  validationService?: ValidationService,
  processService?: ProcessService
) {
  if (notificationService || validationService || processService) {
    workflowRegistry.setServices(
      notificationService,
      validationService,
      processService
    );
  }
}

/**
 * Initialize built-in workflows
 * This is called automatically when module is imported
 */
function initializeBuiltinWorkflows() {
  // Register pembelian workflow for t_cart
  workflowRegistry.registerWorkflow("t_cart", pembelianWorkflow);
}

/**
 * Initialize model workflow
 * Called when initializing a model instance
 */
export function initializeModelWorkflow(modelName: string): boolean {
  const workflow = workflowRegistry.getWorkflow(modelName);
  return workflow != null;
}

// Auto-initialize built-in workflows
initializeBuiltinWorkflows();
