import type { Prisma, User as PrismaUser } from "@prisma/client";
import { BaseModel, DefaultColumns } from "system/model/model";
import {
  ColumnConfig,
  ModelColumns,
  ModelConfig,
  ModelRelations,
  RelationConfig,
} from "system/types";

export class User extends BaseModel<PrismaUser, Prisma.UserWhereInput> {
  title(data: Partial<PrismaUser>) {
    return `${data.username}`;
  }
  config: ModelConfig = {
    modelName: "User",
    tableName: "user",
    relations: relations as ModelRelations,
    columns: columns as ModelColumns,
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
    type: "string",
    label: "Id",
    required: true,
  } as ColumnConfig,
  username: {
    type: "string",
    label: "Username",
    required: true,
  } as ColumnConfig,
  email: {
    type: "string",
    label: "Email",
    required: true,
  } as ColumnConfig,
  password_hash: {
    type: "string",
    label: "Password_hash",
    required: true,
  } as ColumnConfig,
  role: {
    type: "string",
    label: "Role",
    required: false,
  } as ColumnConfig,
  verification_token: {
    type: "string",
    label: "Verification_token",
    required: false,
  } as ColumnConfig,
  email_verified_at: {
    type: "date",
    label: "Email_verified_at",
    required: false,
  } as ColumnConfig,
  reset_token: {
    type: "string",
    label: "Reset_token",
    required: false,
  } as ColumnConfig,
  reset_token_expires: {
    type: "date",
    label: "Reset_token_expires",
    required: false,
  } as ColumnConfig,
};

/** Relations **/
const relations = {
  actionlogs: {
    model: "ActionLog",
    type: "hasMany",
    prismaField: "actionlogs",
    label: "Actionlogs",
  } as any,
  changelogs: {
    model: "ChangeLog",
    type: "hasMany",
    prismaField: "changelogs",
    label: "Changelogs",
  } as any,
  sessions: {
    model: "Session",
    type: "hasMany",
    prismaField: "sessions",
    label: "Sessions",
  } as any,
  roleDetail: {
    model: "Role",
    type: "belongsTo",
    prismaField: "roleDetail",
    label: "RoleDetail",
  } as RelationConfig,
};
