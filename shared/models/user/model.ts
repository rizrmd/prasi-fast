import type { Prisma, User as PrismaUser } from "@prisma/client";
import { Model, DefaultColumns } from "system/model/model";
import {
  ColumnConfig,
  ModelColumns,
  ModelConfig,
  ModelRelations,
  RelationConfig,
} from "system/types";

/** User Columns */
const columns: Record<string, ColumnConfig> = {
  id: {
    type: "string",
    label: "Id",
    required: true,
  },
  username: {
    type: "string",
    label: "Username",
    required: true,
  },
  email: {
    type: "string",
    label: "Email",
    required: true,
  },
  password_hash: {
    type: "string",
    label: "Password_hash",
    required: true,
  },
  role: {
    type: "string",
    label: "Role",
    required: false,
  },
  verification_token: {
    type: "string",
    label: "Verification_token",
    required: false,
  },
  email_verified_at: {
    type: "date",
    label: "Email_verified_at",
    required: false,
  },
  reset_token: {
    type: "string",
    label: "Reset_token",
    required: false,
  },
  reset_token_expires: {
    type: "date",
    label: "Reset_token_expires",
    required: false,
  },
};

/** User Relations */
const relations: Record<string, RelationConfig> = {
  actionlogs: {
    model: "User",
    type: "hasMany",
    prismaField: "actionlogs",
    targetPK: "id",
    label: "Actionlogs",
  },
  changelogs: {
    model: "User",
    type: "hasMany",
    prismaField: "changelogs",
    targetPK: "id",
    label: "Changelogs",
  },
  sessions: {
    model: "User",
    type: "hasMany",
    prismaField: "sessions",
    targetPK: "id",
    label: "Sessions",
  },
  roleDetail: {
    model: "Role",
    type: "belongsTo",
    prismaField: "roleDetail",
    targetPK: "id",
    label: "Role",
  },
};

export class User extends Model<PrismaUser> {
  readonly config: ModelConfig = {
    modelName: "User",
    tableName: "user",
    primaryKey: "id",
    relations: relations as ModelRelations,
    columns: columns as ModelColumns,
  };

  title(data: Partial<PrismaUser>): string {
    return `${data.username}`;
  }

  get columns(): (keyof typeof columns | DefaultColumns)[] {
    return Object.keys(this.config.columns);
  }

  get relations(): (keyof typeof relations)[] {
    return Object.keys(this.config.relations);
  }
}
