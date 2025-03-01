import type { Prisma, User as PrismaUser } from "@prisma/client";
import { Model, DefaultColumns } from "system/model/model";
import {
  ModelRelations,
  RelationConfig,
  ColumnConfig,
  ModelConfig,
  ModelColumns,
} from "system/types";

export class User extends Model<PrismaUser> {
  constructor() {
    super({
      modelName: "User",
      tableName: "user",
      primaryKey: "id",
      relations: relations as ModelRelations,
      columns: columns as ModelColumns,
    });
  }

  titleColumns = ["username"];
  title(data: Partial<PrismaUser>): string {
    return `${data.username}`;
  }

  get columns(): (keyof typeof columns | DefaultColumns)[] {
    return Object.keys(this.state.config.columns);
  }

  get relations(): (keyof typeof relations)[] {
    return Object.keys(this.state.config.relations);
  }
}

/** Columns **/
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
    label: "Password Hash",
    required: true,
  },
  verification_token: {
    type: "string",
    label: "Verification Token",
    required: false,
  },
  email_verified_at: {
    type: "date",
    label: "Email Verified At",
    required: false,
  },
  reset_token: {
    type: "string",
    label: "Reset Token",
    required: false,
  },
  reset_token_expires: {
    type: "date",
    label: "Reset Token Expires At",
    required: false,
  },
  id_role: {
    type: "string",
    label: "Role ID",
    required: false,
  },
};

/** Relations **/
const relations: Record<string, RelationConfig> = {
  role: {
    model: "Role",
    type: "belongsTo",
    prismaField: "role",
    fromColumn: "id_role",
    toColumn: "id",
    label: "Role",
  },
};
