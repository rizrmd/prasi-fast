type DurationString = `${number}${"h" | "d" | "m"}`;

type FieldConfig = {
  editable?: {
    all: boolean;
    except?: string[];
  };
  validation?: string;
  required?: string[];
};

type Assignment = {
  self?: boolean;
  role?: string;
  assignment?: {
    strategy: string;
    role: string;
    escalate_to?: string;
    escalate_after?: DurationString;
  };
  message?: string;
  priority?: string;
  due_at?: { from: string };
  reassign_if?: string;
};

type Trigger = {
  notify?: Array<{
    to: { type: string; value?: string; field?: string };
    template: string;
    data?: Record<string, string>;
  }>;
  calculate?: string;
  create?: Record<string, unknown>;
  process?: string;
  update?: Record<string, unknown>;
  approval?: {
    required_if?: string;
    steps: Array<{
      role: string;
      timeout?: DurationString;
      comment_required?: boolean;
    }>;
  };
};

type RoleConfig = {
  expired?: "never" | { at: string };
  fields?: FieldConfig;
  actions?: { [key: string]: ActionConfig };
};

type StateConfig = {
  description?: string;
  [key: string]: RoleConfig | string | undefined;
};

type ActionConfig = {
  status?: string;
  lock?: boolean;
  roles?: string[];
  assigned_to?: Assignment[];
  fields?: FieldConfig;
  validate?: string;
  trigger?: Trigger;
};

type ModelConfig = {
  created: {
    by: Array<{ role: string }>;
    status: string;
    assigned_to: Assignment[];
  };
  flow: {
    [state: string]: StateConfig;
  };
};

type WorkflowConfig = {
  name: string;
  version: string;
  models: {
    [modelName: string]: ModelConfig;
  };
  audit?: {
    log_changes: boolean;
    capture_fields: string[];
  };
};

export type {
  WorkflowConfig,
  ModelConfig,
  StateConfig,
  ActionConfig,
  RoleConfig,
  Assignment,
  Trigger,
  FieldConfig,
  DurationString
};
