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
      if (cached) return cached;
    }

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

  async findMany(
    params: Partial<
      Omit<PaginationParams, "page" | "perPage"> & {
        select?: Record<string, any> | string[];
        include?: Record<string, any>;
        orderBy?: any;
      }
    > = {}
  ): Promise<T[]> {
    // Check cache for record IDs
    const cachedIds = await this.cacheManager.getQuery(params);
    if (cachedIds && cachedIds.length > 0) {
      const records = await Promise.all(
        cachedIds.map(id => this.findFirst(id))
      );
      // Filter out null values
      return records.filter(Boolean) as T[];
    }

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
      results.map(record => record.id)
    );

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
    // Check cache for record IDs
    const cachedIds = await this.cacheManager.getQuery(params);
    // We don't use the cached IDs for pagination results since we need the count and other metadata
    // This would require additional caching strategies

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

    // Cache record IDs for this query
    await this.cacheManager.setQuery(
      params,
      records.map(record => record.id)
    );

    return result;
  }

  async delete(id: string | { where: Record<string, any> }): Promise<T> {
    // Handle where clause correctly whether id is a string or an object
    const where = typeof id === "string" ? { id } : id.where;
    const stringId = typeof id === "string" ? id : id.where?.id;

    // Invalidate cache for this record
    if (stringId) {
      await this.cacheManager.invalidateRecord(stringId);
    }
    // We only invalidate queries, not all cache entries
    // This is more efficient than invalidateAll

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

    const result = await this.prismaTable.update({
      select: enhancedSelect,
      data,
      where,
    }) as T;

    // Update the record cache with the updated record
    if (result && result.id) {
      await this.cacheManager.setRecord(result.id, result);
    }

    return result;
  }
}
