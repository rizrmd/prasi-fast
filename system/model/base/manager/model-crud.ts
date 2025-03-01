import type { PaginationParams, PaginationResult } from "../../../types";
import type { ModelState } from "../../model";
import type { BaseRecord } from "../model-base";
import { ModelManager } from "../model-manager";

export abstract class ModelCrud<
  T extends BaseRecord = any
> extends ModelManager<T> {
  protected state!: ModelState<T>;

  constructor() {
    super();
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

  // Helper method to check if a query involves relations
  private queryHasRelations(params: any): boolean {
    // Check for explicit include directive
    if (params.include) {
      return true;
    }

    // Check if select contains relation fields
    if (params.select) {
      const relations = this.state.config.relations || {};
      const relationKeys = Object.keys(relations);

      // If select is an array of field names
      if (Array.isArray(params.select)) {
        return params.select.some((field: string) =>
          relationKeys.includes(field)
        );
      }

      // If select is an object
      if (typeof params.select === "object") {
        return Object.keys(params.select).some((field: string) =>
          relationKeys.includes(field)
        );
      }
    }

    return false;
  }

  async findFirst(
    idOrParams:
      | string
      | Partial<PaginationParams & { include?: Record<string, any> }>
  ): Promise<T | null> {
    const isString = typeof idOrParams === "string";
    const stringId = isString ? idOrParams : undefined;
    const params = isString ? { where: { id: stringId } } : idOrParams;

    let queryParams = { ...params };

    // Add deleted_at filter to where clause
    queryParams.where = {
      ...queryParams.where,
      deleted_at: null,
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
      deleted_at: null,
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
      deleted_at: null,
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

    const findManyParams = {
      ...queryParams,
      select: enhancedSelect,
      skip,
      take: perPage,
    };

    const [records, count] = await Promise.all([
      this.prismaTable.findMany(findManyParams) as Promise<T[]>,
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
      data: this.prepareRelationConnect(data),
      select: enhancedSelect,
    }) as Promise<T>;
  }

  prepareRelationConnect = (data: any) => {
    if (!data || typeof data !== "object") {
      return data;
    }

    const relations = this.state.config.relations;
    if (!relations) {
      return data;
    }

    const result = { ...data };

    for (const [key, relation] of Object.entries(relations)) {
      if (!(key in data)) continue;

      const relationData = data[key];
      if (!relationData) continue;

      // Handle belongsTo/hasOne relations
      if (relation.type === "belongsTo" || relation.type === "hasOne") {
        if (relationData.id) {
          result[key] = {
            connect: { id: relationData.id },
          };
        }
      }
      // Handle hasMany relations
      else if (relation.type === "hasMany") {
        if (Array.isArray(relationData)) {
          result[key] = {
            connect: relationData
              .filter((item) => item && item.id)
              .map((item) => ({ id: item.id })),
          };
        }
      }
    }

    return result;
  };

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
      data: this.prepareRelationConnect(data),
      where,
    }) as Promise<T>;
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
      // Perform the update
      const result = await this.prismaTable.updateMany({
        where,
        data: {
          ...this.prepareRelationConnect(data),
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
