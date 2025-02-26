import type { PaginationParams, PaginationResult } from "../../../types";
import type { BaseRecord } from "../model-base";
import { ModelManager } from "../model-manager";
import type { ModelState } from "../../model";
import type { CacheEntry } from "../model-cache";

type FilterNotStartingWith<
  Set,
  Needle extends string
> = Set extends `${Needle}${infer _X}` ? never : Set;

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
  protected abstract invalidateCache(): void;
  protected abstract cacheRecordAndRelations(
    record: Record<string, any>,
    select?: Record<string, any> | string[]
  ): Promise<void>;
  protected abstract attachCachedRelations(
    record: Record<string, any>
  ): Promise<any>;
  protected abstract notifySubscribers(id: string): void;

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

    if (id && this.shouldUseCache()) {
      try {
        const cachedItem = this.state.modelCache.get<T>(
          this.state.config.modelName,
          id
        );
        if (cachedItem) {
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

    console.log(`Querying database for ${this.state.config.modelName}`);

    const record = await this.prismaTable.findFirst(queryParams);

    if (record && this.shouldUseCache()) {
      try {
        await this.cacheRecordAndRelations(record, params.select);
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
    });

    if (this.shouldUseCache() && results.length) {
      await Promise.all(
        results.map((record: any) =>
          this.cacheRecordAndRelations(record, params.select)
        )
      );
    }

    return results as T[];
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
    let queryParams = { ...params };
    const page = queryParams.page || 1;
    const perPage = queryParams.perPage || 10;

    if (Array.isArray(queryParams.select)) {
      queryParams.select = queryParams.select.reduce(
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

    const [records, totalCount] = await Promise.all([
      this.prismaTable.findMany({
        ...queryParams,
        select: enhancedSelect,
        skip,
        take: perPage,
      }),
      this.prismaTable.count({ where: queryParams.where }),
    ]);

    if (this.shouldUseCache() && records.length) {
      await Promise.all(
        records.map((record: any) =>
          this.cacheRecordAndRelations(record, queryParams.select)
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
    select?: Record<string, any> | string[];
  }): Promise<T> {
    const { data, select } = params;

    const enhancedSelect = select ? this.ensurePrimaryKeys(select) : undefined;

    const result = await this.prismaTable.create({
      data,
      select: enhancedSelect,
    });

    if (this.shouldUseCache()) {
      this.invalidateCache();
      await this.cacheRecordAndRelations(result, select);
    }

    const id = result[this.config.primaryKey].toString();
    this.notifySubscribers(id);

    return result as T;
  }

  async update(params: {
    where: { [key: string]: any };
    data: Partial<T>;
    select?: Record<string, any> | string[];
  }): Promise<T> {
    const { where, data, select } = params;

    const enhancedSelect = select ? this.ensurePrimaryKeys(select) : undefined;

    const result = await this.prismaTable.update({
      where,
      data,
      select: enhancedSelect,
    });

    if (this.shouldUseCache()) {
      await this.cacheRecordAndRelations(result, select);
    }

    const id = result[this.config.primaryKey].toString();
    this.notifySubscribers(id);

    return result as T;
  }

  async delete(params: {
    where: { [key: string]: any };
    select?: Record<string, any> | string[];
  }): Promise<T> {
    const { where, select } = params;

    const enhancedSelect = select ? this.ensurePrimaryKeys(select) : undefined;

    const result = await this.prismaTable.delete({
      where,
      select: enhancedSelect,
    });

    if (this.shouldUseCache()) {
      this.invalidateCache();
    }

    const id = result[this.config.primaryKey].toString();
    this.notifySubscribers(id);

    return result as T;
  }
}
