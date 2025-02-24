import type { Prisma, Role as PrismaRole } from "@prisma/client";
import { BaseModel } from "system/model/model";
import { ModelConfig } from "system/types";

export class Role extends BaseModel<PrismaRole, Prisma.RoleWhereInput> {
  protected config: ModelConfig = {
    modelName: "Role", // Use modelName here as well
    tableName: "role", // Use tableName for tableName
    relations: {
    },
    columns: {
      name: {
        type: "string",
        label: "Name",
        required: true,
      },
    }
  };
}
