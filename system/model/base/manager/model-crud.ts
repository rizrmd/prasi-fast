import type { PaginationParams, PaginationResult } from "../../../types";
import type { ModelState } from "../../model";
import type { BaseRecord } from "../model-base";
import { ModelManager } from "../model-manager";

type ModelRecord = {
  [key: string]: any;
  id: string;
};

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

    return this.prismaTable.findMany({
      ...queryParams,
      select: enhancedSelect,
    }) as Promise<T[]>;
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

    return {
      data: records,
      page,
      perPage,
      total: count,
      totalPages: Math.ceil(count / perPage),
    };
  }

  async delete(id: string | { where: Record<string, any> }): Promise<T> {
    // Handle where clause correctly whether id is a string or an object
    const where = typeof id === "string" ? { id } : id.where;

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

    return this.prismaTable.create({
      data,
      select: enhancedSelect,
    }) as Promise<T>;
  }

  async update(opt: {
    data: Partial<T>;
    where: any;
    select?: any;
  }): Promise<T> {
    const { select, data, where } = opt;
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

    return this.prismaTable.update({
      select: enhancedSelect,
      data,
      where,
    }) as Promise<T>;
  }
}
