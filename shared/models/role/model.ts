import type { Prisma, Role as PrismaRole } from "@prisma/client";
import { BaseModel } from "system/model/model";
import { ModelConfig } from "system/types";

export class Role extends BaseModel<PrismaRole, Prisma.RoleWhereInput> {
  protected config: ModelConfig = {
    modelName: "Role",
    tableName: "role",
    relations: {
      creator: {
        model: "User",
        type: "belongsTo",
        foreignKey: "created_by",
        label: "Created By",
      },
      updater: {
        model: "User",
        type: "belongsTo", 
        foreignKey: "updated_by",
        label: "Updated By",
      }
    },
    columns: {
      name: {
        type: "string",
        label: "Name",
        required: true,
      },
      description: {
        type: "string",
        label: "Description",
      },
      permissions: {
        type: "json",
        label: "Permissions",
      }
    },
  };
}
