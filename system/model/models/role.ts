import { BaseModel } from "../model";
import { Role } from "@prisma/client";

export class RoleModel extends BaseModel<Role> {
  constructor() {
    super();
    this.config = {
      modelName: "role",
      tableName: "Role",
      columns: {
        name: {
          type: "string",
          required: true,
          searchable: true
        }
      }
    };
  }
}
