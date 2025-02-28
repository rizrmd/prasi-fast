import { WorkflowManager, WorkflowModelBase, NotificationService, ValidationService, ProcessService } from './workflow-manager';
import pembelianWorkflow from '../../shared/workflows/pembelian';

// Example notification service implementation
class ExampleNotificationService implements NotificationService {
  async sendNotification(to: { type: string; value?: string }, template: string, data: Record<string, any>) {
    console.log(`Sending ${template} notification to ${to.type}:${to.value}`, data);
  }
}

// Example validation service implementation
class ExampleValidationService implements ValidationService {
  async validateAction(validationPath: string, data: any): Promise<boolean> {
    // In a real implementation, you would dynamically import and run the validation
    switch (validationPath) {
      case 'import:validators/cart.validateCartProducts':
        return this.validateCartProducts(data);
      case 'import:validators/cart.validateCheckout':
        return this.validateCheckout(data);
      default:
        return true;
    }
  }

  private validateCartProducts(data: any): boolean {
    return Array.isArray(data.products) && data.products.length > 0;
  }

  private validateCheckout(data: any): boolean {
    return data.customer_id && data.products?.length > 0;
  }
}

// Example process service implementation
class ExampleProcessService implements ProcessService {
  async runProcess(processPath: string, data: any): Promise<void> {
    // In a real implementation, you would dynamically import and run the process
    console.log(`Running process ${processPath}`, data);
  }
}

// Base model class that integrates workflow functionality
abstract class BaseModel implements WorkflowModelBase {
  id: string | number;
  state: string;
  created_at: Date;
  updated_at: Date;
  
  // Workflow manager instance (would be initialized once and shared)
  protected static workflowManager = new WorkflowManager(
    { pembelian: pembelianWorkflow },
    new ExampleNotificationService(),
    new ExampleValidationService(),
    new ExampleProcessService()
  );

  constructor(data: Partial<BaseModel>) {
    this.id = data.id!;
    this.state = data.state!;
    this.created_at = data.created_at ?? new Date();
    this.updated_at = data.updated_at ?? new Date();
  }

  // Method to check if model has workflow
  hasWorkflow(): boolean {
    return BaseModel.workflowManager.hasWorkflow(this.constructor.name);
  }

  // Method to get available actions for a role
  getAvailableActions(role: string): Promise<{ name: string; status?: string }[]> {
    return Promise.resolve(
      BaseModel.workflowManager.getAvailableActions(
        this.constructor.name,
        this.state,
        role
      )
    );
  }

  // Method to check if an action can be performed
  async canPerformAction(role: string, action: string): Promise<{ allowed: boolean; reason?: string }> {
    return BaseModel.workflowManager.canPerformAction(
      this,
      this.constructor.name,
      role,
      action
    );
  }

  // Method to check field editability
  getEditableFields(role: string): Promise<Record<string, boolean> | { _all: true; _except: string[] } | null> {
    return Promise.resolve(
      BaseModel.workflowManager.getFieldConfig(
        this.constructor.name,
        this.state,
        role
      )
    );
  }

  // Method to perform a workflow action
  async performAction(
    role: string,
    action: string,
    userId: string,
    comment?: string
  ): Promise<{ success: boolean; error?: string }> {
    return BaseModel.workflowManager.performAction(
      this,
      this.constructor.name,
      role,
      action,
      userId,
      comment
    );
  }

  // Get audit logs for this model
  getAuditLogs(): Promise<any[]> {
    return Promise.resolve(
      BaseModel.workflowManager.getAuditLogs(this.constructor.name, this.id)
    );
  }
}

// Example Cart model implementation
class Cart extends BaseModel {
  products: Array<{ id: string; quantity: number }>;
  customer_id: string;

  constructor(data: Partial<Cart>) {
    super(data);
    this.products = data.products || [];
    this.customer_id = data.customer_id!;
  }

  // Example business method that uses workflow
  async checkout(userId: string): Promise<{ success: boolean; error?: string }> {
    // Get available actions to show proper error if checkout isn't available
    const actions = await this.getAvailableActions('customer');
    if (!actions.some(a => a.name === 'checkout')) {
      return { success: false, error: 'Checkout action not available' };
    }

    // First check if checkout can be performed
    const canCheckout = await this.canPerformAction('customer', 'checkout');
    if (!canCheckout.allowed) {
      return { success: false, error: canCheckout.reason };
    }

    // Get editable fields to ensure we can modify what we need
    const editableFields = await this.getEditableFields('customer');
    if (!editableFields) {
      return { success: false, error: 'Cannot determine editable fields' };
    }

    // Perform the checkout action
    const result = await this.performAction(
      'customer',
      'checkout',
      userId,
      'Customer initiated checkout'
    );

    if (result.success) {
      // After successful checkout, we might want to clear the cart
      this.products = [];
      this.updated_at = new Date();
      // In a real implementation, you would save these changes
    }

    return result;
  }
}

// Example usage
async function example() {
  // Create a new cart
  const cart = new Cart({
    id: '123',
    state: 'active',
    customer_id: 'user1',
    products: [
      { id: 'p1', quantity: 2 },
      { id: 'p2', quantity: 1 }
    ]
  });

  try {
    // Check if model has workflow
    console.log('Has workflow:', cart.hasWorkflow());

    // Get available actions for customer role
    const actions = await cart.getAvailableActions('customer');
    console.log('Available actions:', actions);

    // Check editable fields
    const editableFields = await cart.getEditableFields('customer');
    console.log('Editable fields:', editableFields);

    // Attempt to checkout
    const result = await cart.checkout('user1');
    if (result.success) {
      console.log('Checkout successful');
      console.log('New state:', cart.state);
      
      // Get audit logs
      const logs = await cart.getAuditLogs();
      console.log('Audit logs:', logs);
    } else {
      console.error('Checkout failed:', result.error);
    }

    // Example: CS reviewing the checkout
    const csActions = await cart.getAvailableActions('cs');
    if (csActions.some(a => a.name === 'approve')) {
      const approveResult = await cart.performAction(
        'cs',
        'approve',
        'cs1',
        'Approved after review'
      );
      console.log('CS approval result:', approveResult);
    }

  } catch (error) {
    console.error('Error during workflow execution:', error);
  }
}

export { BaseModel, Cart, example };
