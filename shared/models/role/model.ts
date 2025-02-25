import type { Prisma, Role as PrismaRole } from "@prisma/client";
import { BaseModel, DefaultColumns } from "system/model/model";
import { ModelRelations, RelationConfig, ColumnConfig, ModelConfig, ModelColumns } from "system/types";

export class Role extends BaseModel<PrismaRole, Prisma.RoleWhereInput> {
  title(data: Partial<PrismaRole>) {
    return `${data.name}`;
  }
  config: ModelConfig = {
    modelName: "Role",
    tableName: "role",
    primaryKey: "id",
    relations: relations as ModelRelations,
    columns: columns as ModelColumns
  };
  get columns() {
    return Object.keys(this.config.columns) as (
      | keyof typeof columns
      | DefaultColumns
    )[];
  }
  get relations() {
    return Object.keys(this.config.relations) as (keyof typeof relations)[];
  }
}

/** Columns **/
const columns = {
  id: {
    "type": "string",
    "label": "Id",
    "required": true
  } as ColumnConfig,
  name: {
    "type": "string",
    "label": "Name",
    "required": true
  } as ColumnConfig
};

/** Relations **/
const relations = {
    user: {
    "model": "User",
    "type": "hasMany",
    "prismaField": "user",
    "targetPK": "id",
    "label": "User"
  } as RelationConfig
  };
