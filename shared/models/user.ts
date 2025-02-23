import type { Prisma, User as PrismaUser } from "@prisma/client";
import { BaseModel } from "system/model/model";
import { ModelConfig } from "system/types";

export class User extends BaseModel<PrismaUser, Prisma.UserWhereInput> {
  protected config: ModelConfig = {
    modelName: "User",
    tableName: "user",
    relations: {
      creator: {
        model: "User",
        type: "belongsTo",
        foreignKey: "created_by",
        label: "Created By",
      },
      updater: {
        model: "User",
        type: "belongsTo",
        foreignKey: "updated_by",
        label: "Updated By",
      },
      createdUsers: {
        model: "User",
        type: "hasMany",
        foreignKey: "created_by",
        label: "Created Users",
      },
      updatedUsers: {
        model: "User",
        type: "hasMany",
        foreignKey: "updated_by",
        label: "Updated Users",
      },
      changelogs: {
        model: "Changelog",
        type: "hasMany",
        foreignKey: "userId",
        label: "Change Logs",
      },
    },
    columns: {
      email: {
        type: "string",
        label: "Email",
        required: true,
        validate: (value) =>
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || "Invalid email format",
      },
      name: {
        type: "string",
        label: "Name",
        required: true,
      },
      role: {
        type: "enum",
        label: "Role",
        enum: ["admin", "user", "guest"],
        required: true,
        format: (value: string) => {
          const roleMap: { [key: string]: string } = {
            admin: "🔑 Admin",
            user: "👤 User",
            guest: "👻 Guest",
          };
          return roleMap[value] || value;
        },
      },
    },
  };
}
