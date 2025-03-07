import type { User as PrismaUser } from "@prisma/client";
import { Model } from "system/model/model";
import {
  ColumnConfig,
  ModelColumns,
  ModelRelations,
  RelationConfig,
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
} as const satisfies Record<string, ColumnConfig>;

/** Relations **/
const relations = {
  role: {
    model: "Role",
    type: "belongsTo",
    prismaField: "role",
    fromColumn: "id_role",
    toColumn: "id",
    label: "Role",
  },
} as const satisfies Record<string, RelationConfig>;
