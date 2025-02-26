import type { PrismaClient } from "@prisma/client";
import type { ModelState, BaseRecord } from "../model";

export abstract class ModelBase<T extends BaseRecord = any> {
  protected state!: ModelState<T>;

  protected get prisma() { return this.state.prisma; }
  protected get config() { return this.state.config; }
  protected get data() { return this.state.data; }
  protected set data(value: T | null) { this.state.data = value; }
  protected get currentUser() { return this.state.currentUser; }
  protected get modelCache() { return this.state.modelCache; }

  protected get prismaTable() {
    if (!this.config?.tableName) {
      throw new Error("Table name not configured");
    }
    return this.prisma[this.config.tableName as keyof PrismaClient] as any;
  }

  protected getDefaultConditions() {
    return {};
  }

  protected buildSearchQuery(search: string) {
    return {};
  }

  protected get columns(): string[] {
    return [
      "id",
      "created_at",
      "updated_at",
      "deleted_at",
      "created_by",
      "updated_by"
    ];
  }
}
