import type { PrismaClient, User } from "@prisma/client";
import { ModelCache } from "./model-cache";
import { ModelConfig, PaginationParams, PaginationResult } from "../types";
import { prismaFrontendProxy } from "./model-client";

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

interface BaseRecord {
  id: string;
  [key: string]: any;
}

type RecordWithRelations<T extends BaseRecord> = T & {
  [key: string]: any;
};

export class BaseModel<T extends BaseRecord = any, W = any> {
  protected prisma!: PrismaClient;
  protected config!: ModelConfig;
  protected currentUser?: User;
  protected data: T | null = null;
  protected _mode: "client" | "server" = "server";
  protected modelCache: ModelCache;
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
      this.mode = "server";
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

  setUser(user: User): this {
    this.currentUser = user;
    return this;
  }

  title(data: Partial<T>) {
    return "";
  }

  private ensurePrimaryKeys(select: Record<string, any>): Record<string, any> {
    const enhancedSelect = { ...select };

    // Ensure model's primary key is selected
    enhancedSelect[this.config.primaryKey] = true;

    // Ensure relation primary keys are selected
    if (this.config.relations) {
      for (const [relationName, relationConfig] of Object.entries(
        this.config.relations
      )) {
        // If relation is selected
        if (select[relationName]) {
          if (typeof select[relationName] === "object") {
            // Ensure relation's primary key is selected
            enhancedSelect[relationName] = {
              ...select[relationName],
              select: {
                ...select[relationName].select,
                [relationConfig.targetPK]: true,
              },
            };
          } else {
            // If relation is just true, create proper select with primary key
            enhancedSelect[relationName] = {
              select: {
                [relationConfig.targetPK]: true,
              },
            };
          }
        }
      }
    }

    return enhancedSelect;
  }

  private getSelectFields(select?: Record<string, any>): string[] {
    if (!select) return [...this.columns];

    const fields: string[] = [];
    for (const [key, value] of Object.entries(select)) {
      if (typeof value === "boolean" && value) {
        fields.push(key);
      } else if (typeof value === "object" && this.config.relations?.[key]) {
        // For relations, we need their foreign keys
        const relationConfig = this.config.relations[key];
        if (relationConfig.type === "belongsTo") {
          fields.push(relationConfig.prismaField);
        }
      }
    }
    // Always include primary key
    if (!fields.includes(this.config.primaryKey)) {
      fields.push(this.config.primaryKey);
    }
    return fields;
  }

  // Core CRUD operations
  async getRelation<RelatedModel>(
    relationName: string
  ): Promise<RelatedModel[] | RelatedModel | null> {
    if (
      !this.data ||
      !this.config.relations?.[relationName] ||
      !this.config.cache
    ) {
      return null;
    }

    const relationConfig = this.config.relations[relationName];
    const relatedIds = this.modelCache.getCachedRelationIds(
      this.config.tableName,
      this.data.id.toString(),
      relationName
    );

    if (!relatedIds) {
      return null;
    }

    if (relationConfig.type === "hasMany") {
      if (!Array.isArray(relatedIds)) return [];

      const relatedRecords = await Promise.all(
        relatedIds.map(async (id) => {
          const record = await this.modelCache.getCachedRecord(
            relationConfig.model,
            id.toString()
          );
          return record as RelatedModel;
        })
      );

      return relatedRecords.filter(Boolean);
    } else {
      // For hasOne and belongsTo
      if (typeof relatedIds !== "number") return null;

      const record = this.modelCache.getCachedRecord(
        relationConfig.model,
        relatedIds.toString()
      );
      return record as RelatedModel;
    }
  }

  async findFirst(
    idOrParams: string | Partial<PaginationParams>
  ): Promise<T | null> {
    const params = typeof idOrParams === "string" ? {} : idOrParams;
    const where = {
      ...this.getDefaultConditions(),
      ...(typeof idOrParams === "string"
        ? { id: idOrParams }
        : params.where || {}),
      deleted_at: null,
      ...(typeof idOrParams !== "string" && params.search
        ? this.buildSearchQuery(params.search)
        : {}),
    };

    const id = typeof idOrParams === "string" ? idOrParams : undefined;
    if (
      id !== undefined &&
      this.config.cache &&
      (params.useCache === undefined || params.useCache)
    ) {
      const cached = this.modelCache.getCachedRecord(
        this.config.tableName,
        id.toString()
      );
      if (cached) {
        this.data = cached as T;
        return this.data;
      }
    }

    this.data = await this.prismaTable.findFirst({ where: where || {} });

    if (
      this.config.cache &&
      this.data &&
      (params.useCache === undefined || params.useCache)
    ) {
      await this.cacheRecordAndRelations(this.data);
    }

    return this.data;
  }

  async findMany(
    params: Partial<PaginationParams & { select?: Record<string, any> }> = {}
  ): Promise<PaginationResult<T>> {
    const normalizedParams = {
      page: params.page || 1,
      perPage: params.perPage || 10,
      orderBy: params.orderBy || "id",
      orderDirection: params.orderDirection || "desc",
      where: {
        ...this.getDefaultConditions(),
        ...params.where,
        deleted_at: null,
        ...(params.search ? this.buildSearchQuery(params.search) : {}),
      },
      search: params.search || "",
      select: params.select,
    };

    const requiredFields = this.getSelectFields(params.select);

    // Try cache first if enabled
    if (
      this.config.cache &&
      (params.useCache === undefined || params.useCache)
    ) {
      const cached = this.modelCache.getCachedList(
        this.config.tableName,
        normalizedParams
      );
      if (cached) {
        const records = await Promise.all(
          cached.ids.map(async (id) => {
            const record = this.modelCache.getCachedRecord(
              this.config.tableName,
              id,
              requiredFields
            );
            if (!record) return null;

            if (this.config.relations) {
              return await this.attachCachedRelations(record);
            }
            return record as T;
          })
        );

        // If all required fields are cached for all records
        if (!records.includes(null)) {
          return {
            data: records.filter(Boolean) as T[],
            total: cached.total,
            page: cached.page,
            perPage: cached.perPage,
            totalPages: cached.totalPages,
          };
        }
      }
    }

    const [total, data] = await Promise.all([
      this.prismaTable.count({ where: normalizedParams.where }),
      this.prismaTable.findMany({
        where: normalizedParams.where,
        skip: (normalizedParams.page - 1) * normalizedParams.perPage,
        take: normalizedParams.perPage,
        orderBy: {
          [normalizedParams.orderBy]: normalizedParams.orderDirection,
        },
        ...(params.select
          ? { select: this.ensurePrimaryKeys(params.select) }
          : {}),
      }),
    ]);

    if (
      this.config.cache &&
      data.length > 0 &&
      (params.useCache === undefined || params.useCache)
    ) {
      for (const record of data) {
        await this.cacheRecordAndRelations(record, params.select);
      }

      this.modelCache.cacheList(
        this.config.tableName,
        normalizedParams,
        {
          ids: data.map((r: Record<string, any>) =>
            r[this.config.primaryKey].toString()
          ),
          total,
          page: normalizedParams.page,
          perPage: normalizedParams.perPage,
          totalPages: Math.ceil(total / normalizedParams.perPage),
        },
        this.config.cache.ttl
      );
    }

    return {
      data: data as T[],
      total,
      page: normalizedParams.page,
      perPage: normalizedParams.perPage,
      totalPages: Math.ceil(total / normalizedParams.perPage),
    };
  }

  protected invalidateCache(): void {
    if (!this.config.cache) return;

    this.modelCache.invalidateModel(this.config.tableName);

    if (this.config.relations) {
      for (const { model } of Object.values(this.config.relations)) {
        this.modelCache.invalidateModel(model);
      }
    }
  }

  private async cacheRecordAndRelations(
    record: Record<string, any>,
    select?: Record<string, any>
  ): Promise<void> {
    if (!this.config.cache) return;

    const id = record[this.config.primaryKey].toString();
    const recordWithoutRelations = { ...record };
    const fields = this.getSelectFields(select);

    if (this.config.relations) {
      for (const relationName of Object.keys(this.config.relations)) {
        if (recordWithoutRelations[relationName]) {
          delete recordWithoutRelations[relationName];
        }
      }
    }

    this.modelCache.cacheRecord(
      this.config.tableName,
      id,
      recordWithoutRelations,
      fields,
      this.config.cache.ttl
    );

    if (this.config.relations) {
      for (const [relationName, relationConfig] of Object.entries(
        this.config.relations
      )) {
        let relationIds: number[] | number | null = null;

        if (relationConfig.type === "belongsTo") {
          const foreignKey = relationConfig.prismaField;
          relationIds = record[foreignKey] || null;
        } else if (relationConfig.type === "hasMany" && record[relationName]) {
          const relatedRecords = record[relationName] as Array<
            Record<string, any>
          >;
          relationIds = relatedRecords.map(
            (r: Record<string, any>) => r[relationConfig.targetPK]
          );
        } else if (relationConfig.type === "hasOne" && record[relationName]) {
          const relatedRecord = record[relationName] as Record<string, any>;
          relationIds = relatedRecord[relationConfig.targetPK] || null;
        }

        if (relationIds !== null) {
          this.modelCache.cacheRelationIds(
            this.config.tableName,
            id,
            relationName,
            relationIds,
            this.config.cache.ttl
          );
        }
      }
    }
  }

  protected getDefaultConditions() {
    return {};
  }

  protected buildSearchQuery(search: string) {
    return {};
  }

  private async attachCachedRelations(record: Record<string, any>): Promise<T> {
    if (!this.config.relations) return record as T;

    const result = { ...record };
    const id = record[this.config.primaryKey].toString();

    for (const [relationName, relationConfig] of Object.entries(
      this.config.relations
    )) {
      const relationIds = this.modelCache.getCachedRelationIds(
        this.config.tableName,
        id,
        relationName
      );

      if (relationIds) {
        if (Array.isArray(relationIds)) {
          const relations = await Promise.all(
            relationIds.map((rid) =>
              this.modelCache.getCachedRecord(
                relationConfig.model,
                rid.toString()
              )
            )
          );
          result[relationName] = relations.filter(Boolean);
        } else {
          const relation = await this.modelCache.getCachedRecord(
            relationConfig.model,
            relationIds.toString()
          );
          if (relation) {
            result[relationName] = relation;
          }
        }
      }
    }

    return result as T;
  }
}
