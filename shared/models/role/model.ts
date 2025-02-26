import type { Prisma, Role as PrismaRole } from "@prisma/client";
import { Model, DefaultColumns } from "system/model/model";
import { ModelRelations, RelationConfig, ColumnConfig, ModelConfig, ModelColumns } from "system/types";

/** Role Columns */
const columns: Record<string, ColumnConfig> = {
  id: {
    type: "string",
    label: "Id",
    required: true
  },
  name: {
    type: "string",
    label: "Name", 
    required: true
  }
};

/** Role Relations */
const relations: Record<string, RelationConfig> = {
  user: {
    model: "User",
    type: "hasMany",
    prismaField: "user",
    targetPK: "id",
    label: "User"
  }
};

export class Role extends Model<PrismaRole> {
  readonly config: ModelConfig = {
    modelName: "Role",
    tableName: "role",
    primaryKey: "id",
    relations: relations as ModelRelations,
    columns: columns as ModelColumns
  };

  title(data: Partial<PrismaRole>): string {
    return `${data.name}`;
  }

  formatCount(count: number): string {
    return `${count} item${count > 1 ? 's' : ''}`;
  }

  get columns(): (keyof typeof columns | DefaultColumns)[] {
    return Object.keys(this.config.columns);
  }

  get relations(): (keyof typeof relations)[] {
    return Object.keys(this.config.relations);
  }
}
