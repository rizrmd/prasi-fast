import type { PaginationParams, PaginationResult } from "../../../types";
import type { ModelState } from "../../model";
import type { BaseRecord } from "../model-base";
import { ModelManager } from "../model-manager";
import { CacheManager, type CacheConfig } from "./model-cache";

type ModelRecord = {
  [key: string]: any;
  id: string;
};

export abstract class ModelCrud<
  T extends BaseRecord = any
> extends ModelManager<T> {
  protected state!: ModelState<T>;
  protected cacheManager: CacheManager;

  constructor() {
    super();
    this.cacheManager = new CacheManager(
      this.state?.config?.modelName || "default"
    );
  }

  protected abstract ensurePrimaryKeys(
    select: Record<string, any>
  ): Record<string, any>;

  protected abstract getSelectFields(
    select?: Record<string, any> | string[]
  ): string[];

  get prismaTable() {
    const prismaModelName =
      this.state.config.modelName.charAt(0).toLowerCase() +
      this.state.config.modelName.slice(1);

    return (this.state.prisma as any)[prismaModelName] as any;
  }

  async findFirst(
    idOrParams: string | Partial<PaginationParams>
  ): Promise<T | null> {
    const isString = typeof idOrParams === "string";
    const stringId = isString ? idOrParams : undefined;
    const params = isString ? { where: { id: stringId } } : idOrParams;

    // Check cache for single record lookup
    if (stringId) {
      const cached = await this.cacheManager.getRecord<T>(stringId);
      if (cached) {
        // Return cached data immediately for better UX

        // Start background fetch to refresh the cache
        this.refreshRecordInBackground(stringId, params);

        return cached;
      }
    }

    // If not cached or no stringId, query normally
    return this.queryAndCacheRecord(params, stringId);
  }

  // Helper method to fetch and cache a record
  private async queryAndCacheRecord(
    params: Partial<PaginationParams>,
    stringId?: string
  ): Promise<T | null> {
    let queryParams = { ...params };

    // Add deleted_at filter to where clause
    queryParams.where = {
      ...queryParams.where,
      deleted_at: {
        not: null,
      },
    };

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

    // Cache single record result
    if (record && stringId) {
      await this.cacheManager.setRecord(stringId, record);
    }

    return record as T | null;
  }

  // Method to refresh a record in the background without blocking
  private refreshRecordInBackground(
    id: string,
    params: Partial<PaginationParams>
  ): void {
    // Use setTimeout with 0ms to push to next event loop tick
    // This ensures we don't block the main execution
    setTimeout(async () => {
      try {
        await this.queryAndCacheRecord(params, id);
      } catch (error) {
        // Silent fail in background process
        console.error(`Background refresh failed for record ${id}:`, error);
      }
    }, 0);
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
    // Check cache for record IDs with freshness information
    const cachedResult = await this.cacheManager.getQueryWithMeta(params);

    // Use cache if available
    if (cachedResult && cachedResult.ids.length > 0) {
      const records = await Promise.all(
        cachedResult.ids.map((id) => this.findFirst(id))
      );
      // Filter out null values
      const validRecords = records.filter(Boolean) as T[];

      // If we got all records from cache, return them immediately
      // and refresh in background if needed
      if (validRecords.length === cachedResult.ids.length) {
        // If not fresh, refresh in background
        if (!cachedResult.fresh) {
          this.refreshQueryInBackground(params);
        }

        return validRecords;
      }
    }

    // If not in cache or incomplete records, perform query normally
    return this.queryAndCacheMany(params);
  }

  // Helper method to fetch and cache multiple records
  private async queryAndCacheMany(
    params: Partial<
      Omit<PaginationParams, "page" | "perPage"> & {
        select?: Record<string, any> | string[];
        include?: Record<string, any>;
        orderBy?: any;
      }
    >
  ): Promise<T[]> {
    let queryParams = { ...params };

    // Add deleted_at filter to where clause
    queryParams.where = {
      ...queryParams.where,
      deleted_at: {
        not: null,
      },
    };

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

    const results = (await this.prismaTable.findMany({
      ...queryParams,
      select: enhancedSelect,
    })) as T[];

    // Cache record IDs instead of full results
    await this.cacheManager.setQuery(
      params,
      results.map((record) => record.id)
    );

    return results;
  }

  // Method to refresh a query in the background
  private refreshQueryInBackground(
    params: Partial<
      Omit<PaginationParams, "page" | "perPage"> & {
        select?: Record<string, any> | string[];
        include?: Record<string, any>;
        orderBy?: any;
      }
    >
  ): void {
    // Use setTimeout with 0ms to push to next event loop tick
    setTimeout(async () => {
      try {
        await this.queryAndCacheMany(params);
      } catch (error) {
        // Silent fail in background process
        console.error("Background query refresh failed:", error);
      }
    }, 0);
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
    // Check cache for record IDs and pagination metadata with freshness information
    const cachedResult = await this.cacheManager.getQueryWithMeta(params);
    if (cachedResult && cachedResult.ids.length > 0 && cachedResult.meta) {
      // Use cached pagination metadata and fetch records from cache
      const records = await Promise.all(
        cachedResult.ids.map((id) => this.findFirst(id))
      );

      // Filter out null records in case some were evicted from cache
      const validRecords = records.filter(Boolean) as T[];

      // If we have all records from cache, return the result
      // and refresh in background if needed
      if (validRecords.length === cachedResult.ids.length) {
        const result = {
          data: validRecords,
          page: cachedResult.meta.page,
          perPage: cachedResult.meta.perPage,
          total: cachedResult.meta.total,
          totalPages: cachedResult.meta.totalPages,
        };

        // If not fresh, refresh in background
        if (!cachedResult.fresh) {
          this.refreshListInBackground(params);
        }

        return result;
      }
    }

    // If not in cache or incomplete records, query normally
    return this.queryAndCacheList(params);
  }

  // Helper method to fetch and cache list with pagination
  private async queryAndCacheList(
    params: Partial<
      PaginationParams & {
        select?: Record<string, any> | string[];
        include?: Record<string, any>;
        orderBy?: any;
      }
    >
  ): Promise<PaginationResult<T>> {
    const queryParams = { ...params };
    const page = queryParams.page || 1;
    const perPage = queryParams.perPage || 10;

    // Add deleted_at filter to where clause
    queryParams.where = {
      ...queryParams.where,
      deleted_at: {
        not: null,
      },
    };

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

    const [records, count] = await Promise.all([
      this.prismaTable.findMany({
        ...queryParams,
        select: enhancedSelect,
        skip,
        take: perPage,
      }) as Promise<T[]>,
      this.prismaTable.count({ where: queryParams.where }),
    ]);

    const result = {
      data: records,
      page,
      perPage,
      total: count,
      totalPages: Math.ceil(count / perPage),
    };

    // Cache record IDs and pagination metadata for this query
    const recordIds = records.map((record) => record.id);
    await this.cacheManager.setQuery(params, recordIds, {
      page,
      perPage,
      total: count,
      totalPages: Math.ceil(count / perPage),
    });

    return result;
  }

  // Method to refresh a paginated list in the background
  private refreshListInBackground(
    params: Partial<
      PaginationParams & {
        select?: Record<string, any> | string[];
        include?: Record<string, any>;
        orderBy?: any;
      }
    >
  ): void {
    // Use setTimeout with 0ms to push to next event loop tick
    setTimeout(async () => {
      try {
        await this.queryAndCacheList(params);
      } catch (error) {
        // Silent fail in background process
        console.error("Background list refresh failed:", error);
      }
    }, 0);
  }

  /**
   * Invalidates only query caches, preserving individual record caches.
   * This is more efficient than invalidating all caches.
   * @private
   */
  private async invalidateQueryCaches(): Promise<void> {
    await this.cacheManager.invalidateAllQueries();
  }

  async delete(id: string | { where: Record<string, any> }): Promise<T> {
    // Handle where clause correctly whether id is a string or an object
    const where = typeof id === "string" ? { id } : id.where;
    const stringId = typeof id === "string" ? id : id.where?.id;

    // Invalidate cache for this record
    if (stringId) {
      await this.cacheManager.invalidateRecord(stringId);
    }

    // Only invalidate query caches using a pattern that matches query keys, not record keys
    // This is more targeted than invalidating everything including record caches
    await this.invalidateQueryCaches();

    // Soft delete by setting deleted_at timestamp
    return this.prismaTable.update({
      where,
      data: {
        deleted_at: new Date(),
      },
      select: {
        id: true,
      },
    }) as Promise<T>;
  }

  async create(opt: {
    data: Partial<T>;
    select?: Record<string, any> | string[];
  }): Promise<T> {
    const { select, data } = opt;

    let selectFields = select;
    if (Array.isArray(select)) {
      selectFields = select.reduce(
        (acc: Record<string, boolean>, field: string) => {
          acc[field] = true;
          return acc;
        },
        {}
      );
    }

    const enhancedSelect = selectFields
      ? this.ensurePrimaryKeys(selectFields as Record<string, any>)
      : undefined;

    const result = (await this.prismaTable.create({
      data,
      select: enhancedSelect,
    })) as T;

    // Add the newly created record to record cache
    if (result && result.id) {
      await this.cacheManager.setRecord(result.id, result);

      // Invalidate query caches since we have new data that might match existing queries
      // This ensures fresh data will be fetched next time any query is made
      await this.cacheManager.invalidateAllQueries();
    }

    return result;
  }

  async update(opt: {
    data: Partial<T>;
    where: any;
    select?: any;
  }): Promise<T> {
    const { select, data, where } = opt;

    // First invalidate the record in cache to prevent stale data
    if (where?.id) {
      await this.cacheManager.invalidateRecord(where.id);
    }

    let selectFields = select;
    if (Array.isArray(select)) {
      selectFields = select.reduce(
        (acc: Record<string, boolean>, field: string) => {
          acc[field] = true;
          return acc;
        },
        {}
      );
    }

    const enhancedSelect = selectFields
      ? this.ensurePrimaryKeys(selectFields as Record<string, any>)
      : undefined;

    const result = (await this.prismaTable.update({
      select: enhancedSelect,
      data,
      where,
    })) as T;

    // Update the record cache with the updated record and invalidate queries
    if (result && result.id) {
      await this.cacheManager.setRecord(result.id, result);

      // Invalidate query caches since modified data might affect existing query results
      await this.cacheManager.invalidateAllQueries();
    }

    return result;
  }

  /**
   * Perform a bulk delete operation on multiple records
   * This is a soft delete that sets deleted_at timestamp
   */
  async deleteMany(params: {
    where: Record<string, any>;
  }): Promise<{ count: number }> {
    const { where } = params;

    try {
      // Invalidate query caches since we're doing a bulk operation
      await this.cacheManager.invalidateAllQueries();

      // Perform soft delete by setting deleted_at timestamp
      const result = await this.prismaTable.updateMany({
        where,
        data: {
          deleted_at: new Date(),
        },
      });

      return { count: result.count };
    } catch (error) {
      console.error("Error in deleteMany:", error);
      throw error;
    }
  }

  /**
   * Perform a bulk update operation on multiple records
   */
  async updateMany(params: {
    where: Record<string, any>;
    data: Record<string, any>;
  }): Promise<{ count: number }> {
    const { where, data } = params;

    try {
      // Invalidate query caches since we're doing a bulk operation
      await this.cacheManager.invalidateAllQueries();

      // Perform the update
      const result = await this.prismaTable.updateMany({
        where,
        data: {
          ...data,
          updated_at: new Date(),
        },
      });

      return { count: result.count };
    } catch (error) {
      console.error("Error in updateMany:", error);
      throw error;
    }
  }
}
