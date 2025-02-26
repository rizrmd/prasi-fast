import type { PaginationParams, PaginationResult } from "../../../types";
import type { BaseRecord } from "../model-base";
import { ModelManager } from "../model-manager";

type FilterNotStartingWith<
  Set,
  Needle extends string
> = Set extends `${Needle}${infer _X}` ? never : Set;

export abstract class ModelCrud<
  T extends BaseRecord = any
> extends ModelManager<T> {
  protected abstract ensurePrimaryKeys(
    select: Record<string, any>
  ): Record<string, any>;
  protected abstract getSelectFields(select?: Record<string, any>): string[];
  protected abstract invalidateCache(): void;
  protected abstract cacheRecordAndRelations(
    record: Record<string, any>,
    select?: Record<string, any>
  ): Promise<void>;
  protected abstract attachCachedRelations(
    record: Record<string, any>
  ): Promise<any>;
  protected abstract notifySubscribers(id: string): void;

  // Helper method to check if caching should be used
  protected shouldUseCache(): boolean {
    return this.state.mode === "client" && !!this.config.cache;
  }

  get prismaTable() {
    const prismaModelName =
      this.config.modelName.charAt(0).toLowerCase() +
      this.config.modelName.slice(1);

    return (this.prisma as any)[prismaModelName] as any;
  }

  async findFirst(
    idOrParams:
      | string
      | Partial<
          PaginationParams & {
            select?: Record<string, any>;
            include?: Record<string, any>;
          }
        >
  ): Promise<T | null> {
    // Handle string ID case
    if (typeof idOrParams === "string") {
      // Check cache first when an ID is provided (client-side only)
      if (this.shouldUseCache()) {
        const cachedRecord = this.modelCache.getCachedRecord(
          this.config.tableName,
          idOrParams
        );

        if (cachedRecord) {
          return this.attachCachedRelations(cachedRecord) as Promise<T>;
        }
      }

      // Set up standard query for single ID
      const where = { [this.config.primaryKey]: idOrParams };
      this.prismaTable;
      const result = await this.prismaTable.findFirst({
        where,
      });

      if (result && this.shouldUseCache()) {
        await this.cacheRecordAndRelations(result);
      }

      return result as T | null;
    }

    // Handle params case
    const { where, select, include, ...rest } = idOrParams as any;

    // Ensure we're selecting primary keys for caching
    const enhancedSelect = select ? this.ensurePrimaryKeys(select) : undefined;

    const result = await this.prismaTable.findFirst({
      where,
      select: enhancedSelect,
      include,
      ...rest,
    });

    if (result && this.shouldUseCache()) {
      await this.cacheRecordAndRelations(result, select);
    }

    return result as T | null;
  }

  async findMany(
    params: Partial<
      Omit<PaginationParams, "page" | "perPage"> & {
        select?: Record<string, any>;
        include?: Record<string, any>;
        orderBy?: any;
      }
    > = {}
  ): Promise<T[]> {
    const { where, select, include, orderBy, ...rest } = params as any;

    // Ensure we're selecting primary keys for caching
    const enhancedSelect = select ? this.ensurePrimaryKeys(select) : undefined;

    const results = await this.prismaTable.findMany({
      where,
      select: enhancedSelect,
      include,
      orderBy,
      ...rest,
    });

    if (this.shouldUseCache() && results.length) {
      await Promise.all(
        results.map((record: any) =>
          this.cacheRecordAndRelations(record, select)
        )
      );
    }

    return results as T[];
  }

  async findList(
    params: Partial<
      PaginationParams & {
        select?: Record<string, any>;
        include?: Record<string, any>;
        orderBy?: any;
      }
    > = {}
  ): Promise<PaginationResult<T>> {
    const {
      page = 1,
      perPage = 10,
      where,
      select,
      include,
      orderBy,
      ...rest
    } = params as any;

    // Ensure we're selecting primary keys for caching
    const enhancedSelect = select ? this.ensurePrimaryKeys(select) : undefined;

    const skip = (page - 1) * perPage;

    // Run both queries in parallel
    const [records, totalCount] = await Promise.all([
      this.prismaTable.findMany({
        where,
        select: enhancedSelect,
        include,
        orderBy,
        skip,
        take: perPage,
        ...rest,
      }),
      this.prismaTable.count({ where }),
    ]);

    if (this.shouldUseCache() && records.length) {
      await Promise.all(
        records.map((record: any) =>
          this.cacheRecordAndRelations(record, select)
        )
      );
    }

    return {
      data: records as T[],
      page,
      perPage,
      total: totalCount,
      totalPages: Math.ceil(totalCount / perPage),
    };
  }

  async create(params: {
    data: Partial<T>;
    select?: Record<string, any>;
  }): Promise<T> {
    const { data, select } = params;

    const enhancedSelect = select ? this.ensurePrimaryKeys(select) : undefined;

    const result = await this.prismaTable.create({
      data,
      select: enhancedSelect,
    });

    // Invalidate model cache since we're adding a new record (client-side only)
    if (this.shouldUseCache()) {
      this.invalidateCache();
      await this.cacheRecordAndRelations(result, select);
    }

    // Notify subscribers
    const id = result[this.config.primaryKey].toString();
    this.notifySubscribers(id);

    return result as T;
  }

  async update(params: {
    where: { [key: string]: any };
    data: Partial<T>;
    select?: Record<string, any>;
  }): Promise<T> {
    const { where, data, select } = params;

    const enhancedSelect = select ? this.ensurePrimaryKeys(select) : undefined;

    const result = await this.prismaTable.update({
      where,
      data,
      select: enhancedSelect,
    });

    if (this.shouldUseCache()) {
      // Update cache with the new data (client-side only)
      await this.cacheRecordAndRelations(result, select);
    }

    // Notify subscribers
    const id = result[this.config.primaryKey].toString();
    this.notifySubscribers(id);

    return result as T;
  }

  async delete(params: {
    where: { [key: string]: any };
    select?: Record<string, any>;
  }): Promise<T> {
    const { where, select } = params;

    const enhancedSelect = select ? this.ensurePrimaryKeys(select) : undefined;

    const result = await this.prismaTable.delete({
      where,
      select: enhancedSelect,
    });

    if (this.shouldUseCache()) {
      // Invalidate cache for this model (client-side only)
      this.invalidateCache();
    }

    // Notify subscribers
    const id = result[this.config.primaryKey].toString();
    this.notifySubscribers(id);

    return result as T;
  }
}
