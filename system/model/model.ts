import type { PrismaClient } from "@prisma/client";
import { cache } from "../cache";
import { prismaFrontendProxy } from "./model-client";
import {
  ModelConfig,
  PaginationParams,
  PaginationResult,
  User,
} from "../types";

const g = (typeof global !== "undefined" ? global : undefined) as unknown as {
  prisma: PrismaClient;
};

interface BaseRecord {
  id: number;
  [key: string]: any; // Add index signature to allow string indexing
}

export class BaseModel<T extends BaseRecord = any, W = any> {
  protected prisma!: PrismaClient;
  protected config!: ModelConfig;
  protected currentUser?: User;
  protected data: T | null = null;
  protected _mode: "client" | "server" = "server";
  [key: string]: any;

  protected async initializePrisma() {
    if (typeof window !== "undefined") {
      this._mode = "client";
      if (!this.config.cache) this.config.cache = { ttl: 60 };
      this.prisma = prismaFrontendProxy(this.config.modelName) as PrismaClient;
    } else {
      this.mode = "server";
      delete this.config.cache;

      if (!g.prisma) {
        g.prisma = new (await import("@prisma/client")).PrismaClient();
      }
      this.prisma = g.prisma;
    }
  }

  public constructor() {
    setTimeout(() => this.initializePrisma(), 0);
  }

  setUser(user: User): this {
    this.currentUser = user;
    return this;
  }

  title() {
    return "";
  }

  // Core CRUD operations
  async create(data: Partial<T>): Promise<T> {
    const validation = this.validate(data);
    if (typeof validation === "string") {
      throw new Error(validation);
    }

    const now = new Date();
    const createData = {
      ...data,
      created_at: now,
      updated_at: now,
      created_by: this.currentUser?.id,
      updated_by: this.currentUser?.id,
    };

    const result = await (this.prisma as any)[this.config.tableName]?.create({
      data: createData,
    });

    await this.logChange({
      table_name: this.config.tableName,
      record_id: result.id,
      action: "create",
      new_data: result,
      created_by: this.currentUser?.id,
    });

    this.invalidateCache();
    return result;
  }

  private get prismaTable() {
    return (this.prisma as any)?.[this.config.tableName] || {};
  }

  public async update(id: number, data: Partial<T>): Promise<T> {
    const validation = this.validate(data);
    if (typeof validation === "string") {
      throw new Error(validation);
    }

    const previous = await this.findFirst(id);
    if (!previous) throw new Error("Record not found");

    const updateData = {
      ...data,
      updated_at: new Date(),
      updated_by: this.currentUser?.id,
    };

    const result = await this.prismaTable.update({
      where: { id },
      data: updateData,
    });

    await this.logChange({
      table_name: this.config.tableName,
      record_id: id,
      action: "update",
      previous_data: previous,
      new_data: result,
      created_by: this.currentUser?.id,
    });

    this.invalidateCache();
    return result;
  }

  async delete(id: number): Promise<T> {
    const previous = await this.findFirst(id);
    if (!previous) throw new Error("Record not found");

    const result = await this.prismaTable.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        updated_by: this.currentUser?.id,
      },
    });

    await this.logChange({
      table_name: this.config.tableName,
      record_id: id,
      action: "delete",
      previous_data: previous,
      new_data: result,
      created_by: this.currentUser?.id,
    });

    this.invalidateCache();
    return result;
  }

  protected async getRelatedRecordIds(record: T): Promise<Record<string, number[] | number | null>> {
    const relatedIds: Record<string, number[] | number | null> = {};

    if (!this.config.relations) {
      return relatedIds;
    }

    for (const [relationName, relationConfig] of Object.entries(this.config.relations)) {
      try {
        const foreignKey = relationConfig.foreignKey;

        if (relationConfig.type === 'hasMany') {
          // For hasMany relations, find all related records where foreignKey matches this record's id
          const relatedRecords = await (this.prisma as any)[relationConfig.model].findMany({
            where: { [foreignKey]: record.id, deleted_at: null },
            select: { id: true }
          });
          relatedIds[relationName] = relatedRecords.map((r: { id: number }) => r.id);
        } else if (relationConfig.type === 'belongsTo') {
          // For belongsTo relations, the foreign key is on this record
          relatedIds[relationName] = record[foreignKey] || null;
        } else if (relationConfig.type === 'hasOne') {
          // For hasOne relations, find the single related record where foreignKey matches this record's id
          const relatedRecord = await (this.prisma as any)[relationConfig.model].findFirst({
            where: { [foreignKey]: record.id, deleted_at: null },
            select: { id: true }
          });
          relatedIds[relationName] = relatedRecord?.id || null;
        }
      } catch (e) {
        console.error(`Error fetching related records for ${relationName}:`, e);
        relatedIds[relationName] = null;
      }
    }

    return relatedIds;
  }

  async getRelation<RelatedModel>(relationName: string): Promise<RelatedModel[] | RelatedModel | null> {
    if (!this.data || !this.config.relations?.[relationName] || !this.config.cache) {
      return null;
    }

    const relationConfig = this.config.relations[relationName];
    const cacheKey = `${this.config.tableName}:${this.data.id}:relations`;
    const relatedIds = cache.get<Record<string, number[] | number | null>>(cacheKey)?.[relationName];

    if (!relatedIds) {
      return null;
    }

    if (relationConfig.type === 'hasMany') {
      if (!Array.isArray(relatedIds)) return [];
      
      const relatedRecords = await Promise.all(
        relatedIds.map(async (id) => {
          const relatedCacheKey = `${relationConfig.model}:${id}`;
          return cache.get<RelatedModel>(relatedCacheKey);
        })
      );
      
      return relatedRecords.filter(Boolean) as RelatedModel[];
    } else {
      // For hasOne and belongsTo
      if (typeof relatedIds !== 'number') return null;
      
      const relatedCacheKey = `${relationConfig.model}:${relatedIds}`;
      return cache.get<RelatedModel>(relatedCacheKey);
    }
  }

  async findFirst(
    idOrParams: number | Partial<PaginationParams>
  ): Promise<T | null> {
    const params = typeof idOrParams === "number" ? {} : idOrParams;
    const where = {
      ...this.getDefaultConditions(),
      ...(typeof idOrParams === "number"
        ? { id: idOrParams }
        : params.where || {}),
      deleted_at: null,
      ...(typeof idOrParams !== "number" && params.search
        ? this.buildSearchQuery(params.search)
        : {}),
    };

    // Skip cache if useCache is false
    if (
      this.config.cache &&
      (params.useCache === undefined || params.useCache)
    ) {
      const cacheKey = `${this.config.tableName}:${JSON.stringify(where)}`;
      try {
        const cached = cache.get<T>(cacheKey);
        if (cached) {
          this.data = cached;
          return cached;
        }
      } catch (e) {
        console.error("Error getting cache", e);
      }
    }

    this.data = await this.prismaTable.findFirst({
      where: where || {},
    });

    // Only cache if we have data and caching is enabled
    if (
      this.config.cache &&
      this.data &&
      (params.useCache === undefined || params.useCache)
    ) {
      try {
        // Cache the main record
        const cacheKey = `${this.config.tableName}:${JSON.stringify(where)}`;
        const recordCacheKey = `${this.config.tableName}:${this.data.id}`;
        
        cache.set(cacheKey, this.data, this.config.cache.ttl);
        cache.set(recordCacheKey, this.data, this.config.cache.ttl);

        // Get and cache related record IDs
        if (this.config.relations) {
          const relatedIds = await this.getRelatedRecordIds(this.data);
          const relationsCacheKey = `${this.config.tableName}:${this.data.id}:relations`;
          cache.set(relationsCacheKey, relatedIds, this.config.cache.ttl);
        }
      } catch (e) {
        console.error("Error setting cache", e);
      }
    }

    return this.data;
  }

  async findMany(
    params: Partial<PaginationParams> = {}
  ): Promise<PaginationResult<T>> {
    const page = params.page || 1;
    const perPage = params.perPage || 10;
    const orderBy = params.orderBy || "id";
    const orderDirection = params.orderDirection || "desc";
    const search = params.search;
    const filters = params.where || {};

    const where = {
      ...this.getDefaultConditions(),
      ...filters,
      deleted_at: null,
      ...(search ? this.buildSearchQuery(search) : {}),
    };

    const cacheKey = `${this.config.tableName}:list:${JSON.stringify({
      page,
      perPage,
      orderBy,
      orderDirection,
      where,
    })}`;

    // Try cache first if enabled
    if (this.config.cache && (params.useCache === undefined || params.useCache)) {
      try {
        const cached = cache.get<PaginationResult<T>>(cacheKey);
        if (cached) return cached;
      } catch (e) {
        console.error("Error getting cache", e);
      }
    }

    const [total, data] = await Promise.all([
      this.prismaTable.count({ where }),
      this.prismaTable.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { [orderBy]: orderDirection },
      }),
    ]);

    // Cache individual records and their relations if caching is enabled
    if (this.config.cache && data.length > 0 && (params.useCache === undefined || params.useCache)) {
      await Promise.all(data.map(async (record: T) => {
        try {
          const recordCacheKey = `${this.config.tableName}:${record.id}`;
          
          // Cache the record
          cache.set(recordCacheKey, record, this.config.cache!.ttl);

          // Get and cache related record IDs if relations exist
          if (this.config.relations) {
            const relatedIds = await this.getRelatedRecordIds(record);
            const relationsCacheKey = `${this.config.tableName}:${record.id}:relations`;
            cache.set(relationsCacheKey, relatedIds, this.config.cache!.ttl);
          }
        } catch (e) {
          console.error(`Error caching record ${record.id}:`, e);
        }
      }));
    }

    const result = {
      data,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    };

    // Cache the results if enabled
    if (this.config.cache && (params.useCache === undefined || params.useCache)) {
      try {
        cache.set(cacheKey, result, this.config.cache.ttl);
      } catch (e) {
        console.error("Error setting cache", e);
      }
    }

    return result;
  }

  async deleteMany(where: any): Promise<any> {
    const result = await this.prismaTable.updateMany({
      where,
      data: {
        deleted_at: new Date(),
        updated_by: this.currentUser?.id,
      },
    });

    this.invalidateCache();
    return result;
  }

  async createMany(records: Partial<T>[]): Promise<T[]> {
    const now = new Date();
    const data = records.map((record) => ({
      ...record,
      created_at: now,
      updated_at: now,
      created_by: this.currentUser?.id,
      updated_by: this.currentUser?.id,
    }));

    const result = await this.prismaTable.createMany({
      data,
    });

    this.invalidateCache();
    return result;
  }

  async updateMany(where: any, data: Partial<T>): Promise<any> {
    const now = new Date();
    const updateData = {
      ...data,
      updated_at: now,
      updated_by: this.currentUser?.id,
    };

    const result = await this.prismaTable.updateMany({
      where,
      data: updateData,
    });

    this.invalidateCache();
    return result;
  }

  getDefaultConditions(): Partial<W> {
    return {};
  }

  protected buildSearchQuery(search: string): Record<string, any> {
    const searchableColumns = Object.entries(this.config.columns)
      .filter(([_, config]) => config.searchable)
      .map(([name]) => name);

    if (!searchableColumns.length) return {};

    return {
      OR: searchableColumns.map((column) => ({
        [column]: { contains: search, mode: "insensitive" },
      })),
    };
  }

  protected async logChange(entry: any): Promise<void> {
    if (this._mode === "client") return;

    await this.prisma.changelog.create({
      data: entry,
    });
  }

  protected clearCache(): void {
    if (this._mode === "client" && this.config.cache) {
      // Clear only this model's records
      const pattern = new RegExp(`^${this.config.tableName}:`);
      cache.invalidatePattern(pattern);
    }
  }

  protected invalidateCache() {
    // Only perform cache operations if caching is enabled
    if (!this.config.cache) return;

    this.clearCache();

    // If this model has relations defined, also clear related model caches
    if (this.config.relations) {
      for (const { model } of Object.values(this.config.relations)) {
        const pattern = new RegExp(`^${model}:`);
        cache.invalidatePattern(pattern);
      }
    }
  }

  // Validation methods
  protected validate(data: any): boolean | string {
    for (const [field, config] of Object.entries(this.config.columns)) {
      if (config.required && !data[field]) {
        return `Field ${field} is required`;
      }

      if (config.validate && data[field]) {
        const validationResult = config.validate(data[field]);
        if (typeof validationResult === "string") {
          return validationResult;
        }
        if (!validationResult) {
          return `Invalid value for field ${field}`;
        }
      }

      if (config.enum && data[field] && !config.enum.includes(data[field])) {
        return `Invalid value for enum field ${field}. Must be one of: ${config.enum.join()}`;
      }
    }

    return true;
  }
}
