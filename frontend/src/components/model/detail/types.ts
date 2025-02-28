export type FormWriter = {
  data: any;
  unsaved: boolean;
  resetting: boolean;
  saving: boolean;
  deleting: boolean;
  prevId: string | null;
  nextId: string | null;
  error: {
    fields: Record<string, string>;
    system: string;
    recordId: string;
  };
};
