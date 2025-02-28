import type { PaginationParams, PaginationResult } from "../../../types";
import type { ModelState } from "../../model";
import type { BaseRecord } from "../model-base";
import { ModelManager } from "../model-manager";
import { generateHash } from "../../../utils/object-hash";

type ModelRecord = {
  [key: string]: any;
  id: string;
};

type CacheResult<T> = T | null;

export abstract class ModelCrud<
  T extends BaseRecord = any
> extends ModelManager<T> {
  protected state!: ModelState<T>;

  protected abstract ensurePrimaryKeys(
    select: Record<string, any>
  ): Record<string, any>;
  protected abstract getSelectFields(
    select?: Record<string, any> | string[]
  ): string[];
  protected abstract invalidateCache(id?: string): void;
  protected abstract cacheRecordAndRelations(
    record: ModelRecord,
    select?: Record<string, any> | string[]
  ): Promise<void>;
  protected abstract attachCachedRelations(
    record: ModelRecord
  ): Promise<any>;

  protected shouldUseCache(): boolean {
    return this.state.mode === "client" && !!this.state.config?.cache?.ttl;
  }

  get prismaTable() {
    const prismaModelName =
      this.config.modelName.charAt(0).toLowerCase() +
      this.config.modelName.slice(1);

    return (this.prisma as any)[prismaModelName] as any;
  }

  async findFirst(
    idOrParams: string | Partial<PaginationParams>
  ): Promise<T | null> {
    const isString = typeof idOrParams === "string";
    const stringId = isString ? idOrParams : undefined;
    const params = isString ? { where: { id: stringId } } : idOrParams;

    // Check for ID in either string parameter or where clause
    const id = stringId || (params.where?.id as string | undefined);

    const shouldCache = params.useCache ?? this.shouldUseCache();
    if (id && shouldCache) {
      try {
        const cachedItem = this.state.modelCache.get<T>(
          this.state.config.modelName,
          id
        );
        if (cachedItem && typeof cachedItem === 'object') {
          // Ensure we're returning a properly structured record
          return cachedItem;
        }
      } catch (error) {
        console.error("Cache read error:", error);
      }
    }

    let queryParams = { ...params };

    if (Array.isArray(params.select)) {
      queryParams.select = params.select.reduce(
        (acc: Record<string, boolean>, field: string) => {
          acc[field] = true;
          return acc;
        },
        {}
      );
    }

    const record = await this.prismaTable.findFirst(queryParams);

    if (record && shouldCache) {
      try {
        await this.cacheRecordAndRelations(record as ModelRecord, params.select);
      } catch (error) {}
    }

    return record as T | null;
  }

  async findMany(
    params: Partial<
      Omit<PaginationParams, "page" | "perPage"> & {
        select?: Record<string, any> | string[];
        include?: Record<string, any>;
        orderBy?: any;
      }
    > = {}
  ): Promise<T[]> {
    let queryParams = { ...params };
    const shouldCache = params.useCache ?? this.shouldUseCache();

    if (shouldCache) {
      // Try to get cached query results first
      const cachedIds = this.state.modelCache.getCachedQueryResults(
        this.state.config.modelName,
        {
          where: queryParams.where,
          orderBy: queryParams.orderBy,
          select: queryParams.select
        }
      );

      if (cachedIds) {
        // If we have cached IDs, try to get records from cache
        const cachedRecords = await Promise.all(
          cachedIds.map((id: string) => 
            this.state.modelCache.get<T>(
              this.state.config.modelName,
              id
            )
          )
        ) as CacheResult<T>[];

        const validRecords = cachedRecords.filter((r): r is T => r !== null);
        if (validRecords.length === cachedRecords.length) {
          return validRecords;
        }
      }
    }

    // Transform array select to object
    if (Array.isArray(params.select)) {
      queryParams.select = params.select.reduce(
        (acc: Record<string, boolean>, field: string) => {
          acc[field] = true;
          return acc;
        },
        {}
      );
    }

    const enhancedSelect = queryParams.select
      ? this.ensurePrimaryKeys(queryParams.select)
      : undefined;

    const results = await this.prismaTable.findMany({
      ...queryParams,
      select: enhancedSelect,
    }) as T[];

    if (shouldCache && results.length) {
      // Cache individual records and their relations
      await Promise.all(
        results.map((record: T) =>
          this.cacheRecordAndRelations(record as ModelRecord, queryParams.select)
        )
      );

      // Cache the query results
      await this.state.modelCache.cacheQueryResults(
        this.state.config.modelName,
        {
          where: queryParams.where,
          orderBy: queryParams.orderBy,
          select: queryParams.select
        },
        results.map((record) => record[this.config.primaryKey]),
        this.state.config.cache?.ttl || 300
      );
    }

    return results;
  }

  async findList(
    params: Partial<
      PaginationParams & {
        select?: Record<string, any> | string[];
        include?: Record<string, any>;
        orderBy?: any;
      }
    > = {}
  ): Promise<PaginationResult<T>> {
    const queryParams = { ...params };
    const page = queryParams.page || 1;
    const perPage = queryParams.perPage || 10;
    const shouldCache = params.useCache ?? this.shouldUseCache();

    // Generate cache key that includes pagination info
    const cacheParams = {
      where: queryParams.where,
      orderBy: queryParams.orderBy,
      select: queryParams.select,
      page,
      perPage
    };

    if (shouldCache) {
      // Try to get cached query results
      const cachedIds = this.state.modelCache.getCachedQueryResults(
        this.state.config.modelName,
        cacheParams
      );

      if (cachedIds) {
        // Try to get cached records
        const cachedRecords = await Promise.all(
          cachedIds.map((id: string) => 
            this.state.modelCache.get<T>(
              this.state.config.modelName,
              id
            )
          )
        ) as CacheResult<T>[];

        // Get total count from cached metadata
        const countHash = await this.generateQueryHash(queryParams.where || {});
        const cachedMeta = this.state.modelCache.get<{ total: number }>(
          this.state.config.modelName,
          `count:${countHash}`
        );

        // Check if all records are valid and metadata is available
        const validRecords = cachedRecords.filter((r): r is T => r !== null);
        if (validRecords.length === cachedRecords.length && cachedMeta?.total !== undefined) {
          return {
            data: validRecords,
            page,
            perPage,
            total: cachedMeta.total,
            totalPages: Math.ceil(cachedMeta.total / perPage),
          };
        }
      }
    }

    if (Array.isArray(queryParams.select)) {
      queryParams.select = params.select?.reduce(
        (acc: Record<string, boolean>, field: string) => {
          acc[field] = true;
          return acc;
        },
        {}
      );
    }

    const enhancedSelect = queryParams.select
      ? this.ensurePrimaryKeys(queryParams.select)
      : undefined;

    const skip = (page - 1) * perPage;

    const [dbRecords, count] = await Promise.all([
      this.prismaTable.findMany({
        ...queryParams,
        select: enhancedSelect,
        skip,
        take: perPage,
      }) as Promise<T[]>,
      this.prismaTable.count({ where: queryParams.where }),
    ]);

    if (shouldCache && dbRecords.length) {
      // Cache individual records and their relations
      await Promise.all(
        dbRecords.map((record: T) =>
          this.cacheRecordAndRelations(record as ModelRecord, queryParams.select)
        )
      );

      // Cache the query results with pagination info
      await this.state.modelCache.cacheQueryResults(
        this.state.config.modelName,
        cacheParams,
        dbRecords.map((record) => record[this.config.primaryKey]),
        this.state.config.cache?.ttl || 300
      );

      // Cache count result
      const countHash = await this.generateQueryHash(queryParams.where || {});
      await this.state.modelCache.set(
        this.state.config.modelName,
        `count:${countHash}`,
        { total: count },
        this.state.config.cache?.ttl || 300
      );
    }

    return {
      data: dbRecords,
      page,
      perPage,
      total: count,
      totalPages: Math.ceil(count / perPage),
    };
  }

  protected async generateQueryHash(params: Record<string, any>): Promise<string> {
    return generateHash(params);
  }
}
