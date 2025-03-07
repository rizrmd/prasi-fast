import type { Role as PrismaRole } from "@prisma/client";
import { DefaultColumns, Model } from "system/model/model";
import {
  ColumnConfig,
  ModelColumns,
  ModelRelations,
  RelationConfig,
} from "system/types";

export class Role extends Model<PrismaRole> {
  constructor() {
    super({
      modelName: "Role",
      tableName: "role",
      primaryKey: "id",
      relations: relations as ModelRelations,
      columns: columns as ModelColumns,
    });
  }

  title(data: Partial<PrismaRole>): string {
    return data?.["name"] ? String(data["name"]) : "";
  }
  titleColumns = ["name"];

  get columns() {
    return Object.keys(columns) as (keyof typeof columns)[];
  }

  get relations() {
    return Object.keys(relations) as (keyof typeof relations)[];
  }
}

/** Columns **/
const columns = {
  id: {
    type: "string",
    label: "Id",
    required: true,
  },
  name: {
    type: "string",
    label: "Name",
    required: true,
  },
} as const satisfies Record<string, ColumnConfig>;

/** Relations **/
const relations = {
  user: {
    model: "User",
    type: "hasMany",
    prismaField: "user",
    fromColumn: "id_role",
    toColumn: "id",
    label: "User",
  },
} as const satisfies Record<string, RelationConfig>;
