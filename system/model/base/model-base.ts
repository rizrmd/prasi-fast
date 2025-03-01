import type { PrismaClient, User } from "@prisma/client";
import type { ModelConfig } from "../../types";
import type { ModelState } from "../model";
import { prismaFrontendProxy } from "../model-client";

const g = (typeof global !== "undefined" ? global : undefined) as unknown as {
  prisma: PrismaClient;
};

export const defaultColumns = [
  "id",
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

export abstract class BaseModel<T extends BaseRecord = any> {
  protected state!: ModelState<T>;
  protected _mode: "client" | "server" = "server";

  protected get prisma() { return this.state.prisma; }
  protected get config() { return this.state.config; }
  protected get data() { return this.state.data; }
  protected set data(value: T | null) { this.state.data = value; }
  protected get currentUser() { return this.state.currentUser; }

  protected get prismaTable() {
    if (!this.config?.modelName) {
      throw new Error("Model name not configured");
    }
    return this.prisma[this.config.modelName as keyof PrismaClient] as any;
  }

  protected async initializePrisma() {
    if (typeof window !== "undefined") {
      this._mode = "client";
      if (!this.config.cache) this.config.cache = { ttl: 60 };
      this.state.prisma = prismaFrontendProxy() as PrismaClient;
    } else {
      this._mode = "server";
      delete this.config.cache;

      if (!g.prisma) {
        g.prisma = new (await import("@prisma/client")).PrismaClient();
      }
      this.state.prisma = g.prisma;
    }
  }

  public constructor() {
    setTimeout(() => this.initializePrisma(), 0);
  }

  protected getDefaultConditions() {
    return {};
  }

  protected buildSearchQuery(search: string) {
    return {};
  }

  protected get columns(): string[] {
    return [...defaultColumns];
  }

  title(data: Partial<T>) {
    return "";
  }
}
