import type { Prisma, Role as PrismaRole } from "@prisma/client";
import { BaseModel } from "system/model/model";
import { ModelConfig } from "system/types";

export class Role extends BaseModel<PrismaRole, Prisma.RoleWhereInput> {
  title(data: Partial<PrismaRole>) {
    return `${data.name}`;
  }
  protected config: ModelConfig = {
    modelName: "Role",
    tableName: "role",
    relations: {
  "user": {
    "model": "User",
    "type": "hasMany",
    "foreignKey": "user",
    "label": "User"
  }
},
    columns: {
  "id": {
    "type": "string",
    "label": "Id",
    "required": true
  },
  "name": {
    "type": "string",
    "label": "Name",
    "required": true
  },
  "created_at": {
    "type": "date",
    "label": "Created_at",
    "required": true
  },
  "updated_at": {
    "type": "date",
    "label": "Updated_at",
    "required": false
  },
  "deleted_at": {
    "type": "date",
    "label": "Deleted_at",
    "required": false
  },
  "created_by": {
    "type": "string",
    "label": "Created_by",
    "required": false
  },
  "updated_by": {
    "type": "string",
    "label": "Updated_by",
    "required": false
  }
}
  };
}
