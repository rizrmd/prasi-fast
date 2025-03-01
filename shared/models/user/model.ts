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

  title(data: Partial<PrismaUser>): string {
    return data["username"] ? String(data["username"]) : "";
  }
  titleColumns = ["username"];

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
    label: "Password_hash",
    required: true,
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
  id_role: {
    type: "string",
    label: "Id_role",
    required: false,
  },
};

/** Relations **/
const relations: Record<string, RelationConfig> = {
  role: {
    model: "Role",
    type: "belongsTo",
    prismaField: "role",
    fromColumn: "id",
    toColumn: "id_role",
    label: "Role",
  },
};
