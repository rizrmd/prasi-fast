import type { WorkflowConfig } from "../../system/workflow/types";

export default {
  name: "pembelian",
  version: "1.1", // NEW: Workflow versioning
  models: {
    t_cart: {
      created: {
        by: [{ role: "customer" }],
        status: "active",
        assigned_to: [
          { 
            self: true,
            // NEW: Dynamic task assignment with fallback
            assignment: { 
              strategy: "round-robin", 
              role: "cs",
              escalate_to: "cs_manager",
              escalate_after: "24h" // Escalate if unassigned
            }
          },
        ],
      },
      flow: {
        active: {
          customer: {
            expired: "never",
            fields: {
              editable: {
                all: false,
                except: ["t_cart_product"],
              },
              validation: "import:validators/cart.validateCartProducts"
            },
            actions: {
              checkout: {
                // NEW: Transition to approval state instead of direct payment
                status: "awaiting_cs_approval", // NEW: Approval state
                assigned_to: [
                  { 
                    role: "cs", 
                    message: "Review order for upsell opportunities",
                    // NEW: Priority and due date
                    priority: "high",
                    due_at: { from: "triggered_at + 2h" }
                  }
                ],
                validate: "import:validators/cart.validateCheckout",
                // NEW: Mandatory comment for audit trail
                fields: { required: ["comment"] }, 
                trigger: {
                  notify: [
                    { 
                      to: { type: "role", value: "cs" },
                      template: "awaiting_review",
                      // NEW: Dynamic content in notifications
                      data: { cart_id: "id", customer: "customer.name" }
                    }
                  ]
                }
              },
            },
          },
        },
        // NEW: Explicit approval state
        awaiting_cs_approval: {
          description: "Pending CS review for upsell or validation",
          cs: {
            actions: {
              approve: {
                status: "payment",
                // NEW: Lock to prevent concurrent edits
                lock: true, 
                fields: { required: ["comment"] }, // Audit trail
                trigger: {
                  calculate: "import:calculations/invoice.createInvoiceFromCart",
                  create: { /* ... (original invoice logic) ... */ }
                }
              },
              reject: {
                status: "active",
                fields: { required: ["reason"] }, // Mandatory rejection reason
                trigger: {
                  notify: [
                    { 
                      to: { type: "customer", field: "email" },
                      template: "checkout_rejected",
                      data: { reason: "reason" } // Dynamic rejection reason
                    }
                  ]
                }
              }
            }
          }
        },
        payment: {
          customer: {
            expired: { at: "2days" },
            fields: { /* ... */ },
            actions: {
              checkout: {
                // NEW: Multi-level approval for large amounts
                validate: "import:validators/payment.validatePaymentAmount",
                trigger: {
                  process: "import:processors/payment.processPayment",
                  // NEW: Conditional approval chain
                  approval: { 
                    required_if: "total_amount > 1000",
                    steps: [
                      { role: "cs", timeout: "12h" },
                      { role: "finance_manager", timeout: "24h" }
                    ]
                  },
                  update: { /* ... */ }
                }
              }
            }
          }
        },
        // NEW: Added escalation rules for admin actions
        admin: {
          admin: {
            actions: {
              force_cancel: {
                roles: ["admin"],
                // NEW: Approval chain for sensitive actions
                trigger: { 
                  approval: { 
                    steps: [
                      { role: "admin", comment_required: true },
                      { role: "compliance", timeout: "24h" }
                    ]
                  }
                }
              }
            }
          }
        },
        paid: {
          fulfillment: {
            actions: {
              ship: {
                // NEW: Task delegation and expiry
                assigned_to: [
                  { 
                    role: "fulfillment", 
                    reassign_if: "unactioned_after 12h",
                    priority: "medium"
                  }
                ],
                fields: { required: ["tracking_number"] }
              }
            }
          }
        }
      }
    }
  },
  // NEW: Global audit trail settings
  audit: {
    log_changes: true,
    capture_fields: ["user.id", "timestamp", "comment"]
  }
} as const satisfies WorkflowConfig;
