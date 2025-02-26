import type { PaginationParams, PaginationResult } from "../../types";
import type { BaseRecord } from "./model-base";
import { ModelManager } from "./model-manager";

export abstract class ModelCrud<T extends BaseRecord = any> extends ModelManager<T> {

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

    // Check for direct ID or primary key in where clause
    const id =
      typeof idOrParams === "string"
        ? idOrParams
        : params.where?.[this.config.primaryKey];

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

  async findList(
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

  async findMany(
    params: Partial<
      Omit<PaginationParams, "page" | "perPage"> & {
        select?: Record<string, any>;
      }
    > = {}
  ): Promise<T[]> {
    const normalizedParams = {
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

    const data = await this.prismaTable.findMany({
      where: normalizedParams.where,
      orderBy: {
        [normalizedParams.orderBy]: normalizedParams.orderDirection,
      },
      ...(params.select
        ? { select: this.ensurePrimaryKeys(params.select) }
        : {}),
    });

    return data as T[];
  }

  async create(params: { data: Partial<T> }): Promise<T> {
    if (!this.currentUser) {
      throw new Error("User not set");
    }

    const now = new Date();
    const createData = {
      ...params.data,
      created_at: now,
      updated_at: now,
      created_by: this.currentUser.id,
      updated_by: this.currentUser.id,
    };

    const record = await this.prismaTable.create({
      data: createData,
    });

    if (this.config.cache) {
      await this.cacheRecordAndRelations(record);
      this.invalidateCache(); // Invalidate list caches
    }

    this.notifySubscribers(record.id);
    this.data = record as T;
    return record as T;
  }

  async update(params: { where: { [key: string]: any }; data: Partial<T> }): Promise<T> {
    if (!this.currentUser) {
      throw new Error("User not set");
    }

    const updateData = {
      ...params.data,
      updated_at: new Date(),
      updated_by: this.currentUser.id,
    };

    const record = await this.prismaTable.update({
      where: params.where,
      data: updateData,
    });

    if (this.config.cache) {
      await this.cacheRecordAndRelations(record);
      this.invalidateCache(); // Invalidate list caches
    }

    this.notifySubscribers(record.id);
    this.data = record as T;
    return record as T;
  }

  async delete(params: { where: { [key: string]: any } }): Promise<T> {
    if (!this.currentUser) {
      throw new Error("User not set");
    }

    const record = await this.prismaTable.update({
      where: params.where,
      data: {
        deleted_at: new Date(),
        updated_at: new Date(),
        updated_by: this.currentUser.id,
      },
    });

    if (this.config.cache) {
      await this.cacheRecordAndRelations(record);
      this.invalidateCache(); // Invalidate list caches
    }

    this.notifySubscribers(record.id);
    this.data = record as T;
    return record as T;
  }

  protected getDefaultConditions() {
    return {};
  }

  protected buildSearchQuery(search: string) {
    return {};
  }

  protected ensurePrimaryKeys(select: Record<string, any>): Record<string, any> {
    throw new Error("ensurePrimaryKeys must be implemented");
  }

  protected getSelectFields(select?: Record<string, any>): string[] {
    throw new Error("getSelectFields must be implemented");
  }

  protected invalidateCache(): void {
    throw new Error("invalidateCache must be implemented");
  }

  protected async cacheRecordAndRelations(
    record: Record<string, any>,
    select?: Record<string, any>
  ): Promise<void> {
    throw new Error("cacheRecordAndRelations must be implemented");
  }

  protected async attachCachedRelations(record: Record<string, any>): Promise<T> {
    throw new Error("attachCachedRelations must be implemented");
  }

  protected notifySubscribers(id: string): void {
    throw new Error("notifySubscribers must be implemented");
  }
}
