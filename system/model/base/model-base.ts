import type { PrismaClient, User } from "@prisma/client";
import { ModelConfig } from "../../types";
import { ModelCache } from "../model-cache";
import { prismaFrontendProxy } from "../model-client";

const g = (typeof global !== "undefined" ? global : undefined) as unknown as {
  prisma: PrismaClient;
};

export const defaultColumns = [
  "created_at",
  "updated_at",
  "deleted_at",
  "created_by",
  "updated_by",
] as const;

export type DefaultColumns = (typeof defaultColumns)[number];

export interface BaseRecord {
  id: string;
  [key: string]: any;
}

export class BaseModel<T extends BaseRecord = any, W = any> {
  protected prisma!: PrismaClient;
  protected config!: ModelConfig;
  protected data: T | null = null;
  protected _mode: "client" | "server" = "server";
  protected modelCache: ModelCache;
  protected currentUser: User | null = null;
  [key: string]: any;

  protected get prismaTable() {
    if (!this.config?.tableName) {
      throw new Error("Table name not configured");
    }
    return this.prisma[this.config.tableName as keyof PrismaClient] as any;
  }

  protected async initializePrisma() {
    if (typeof window !== "undefined") {
      this._mode = "client";
      if (!this.config.cache) this.config.cache = { ttl: 60 };
      this.prisma = prismaFrontendProxy() as PrismaClient;
    } else {
      this._mode = "server";
      delete this.config.cache;

      if (!g.prisma) {
        g.prisma = new (await import("@prisma/client")).PrismaClient();
      }
      this.prisma = g.prisma;
    }
  }

  public constructor() {
    this.modelCache = new ModelCache();
    setTimeout(() => this.initializePrisma(), 0);
  }

  public setCurrentUser(user: User | null): void {
    this.currentUser = user;
  }

  title(data: Partial<T>) {
    return "";
  }
}
