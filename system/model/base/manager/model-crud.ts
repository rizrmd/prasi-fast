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

  async findFirst(
    idOrParams:
      | string
      | Partial<
          PaginationParams & {
            include?: Record<string, any>;
            filters?: Record<string, any[]>;
            sort?: { column: string; direction: "asc" | "desc" } | null;
          }
        >
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

    // Handle filters
    if (queryParams.filters && Object.keys(queryParams.filters).length > 0) {
      for (const [column, values] of Object.entries(queryParams.filters)) {
        if (Array.isArray(values) && values.length > 0) {
          // Add filter to where clause
          queryParams.where[column] = {
            in: values,
          };
        }
      }
    }

    // Handle sorting
    if (queryParams.sort && queryParams.sort.column) {
      queryParams.orderBy = {
        [queryParams.sort.column]: queryParams.sort.direction,
      };
    }

    if (Array.isArray(params.select)) {
      queryParams.select = params.select.reduce(
        (acc: Record<string, boolean>, field: string) => {
          acc[field] = true;
          return acc;
        },
        {}
      );
    }

    // Remove custom parameters that Prisma doesn't understand
    delete queryParams.filters;
    delete queryParams.sort;

    const record = await this.prismaTable.findFirst(queryParams);
    return record as T | null;
  }

  async save(data: Partial<T>): Promise<Partial<T>> {
    try {
      // Clone the data to avoid modifying the original
      const dataToSave = { ...data };
      const relations: Record<string, any> = {};

      // Get the primary key from config
      const primaryKey = this.state.config.primaryKey || "id";

      // Check if there are relations in the data
      if (this.state.config.relations) {
        // Extract relations from data
        for (const [key, relationConfig] of Object.entries(
          this.state.config.relations
        )) {
          if (
            key in dataToSave &&
            dataToSave[key] !== null &&
            typeof dataToSave[key] === "object"
          ) {
            // Store the relation data
            relations[key] = dataToSave[key];
            // Remove the relation from the data to be saved
            delete dataToSave[key];
          }
        }
      }

      let result;

      // Determine whether to update or create
      if (dataToSave[primaryKey]) {
        // If primary key exists, use update directly
        result = await this.prismaTable.update({
          data: dataToSave,
          where: { [primaryKey]: dataToSave[primaryKey] },
        });
      } else {
        // If no primary key, use create directly
        result = await this.prismaTable.create({
          data: dataToSave,
        });
      }

      // Process relations if any
      if (Object.keys(relations).length > 0 && result[primaryKey]) {
        // Prepare relation data with proper connect syntax
        const relationData = this.prepareRelationConnect(relations);

        // Update the record with relation connections directly
        result = await this.prismaTable.update({
          data: relationData,
          where: { [primaryKey]: result[primaryKey] },
        });
      }

      return result;
    } catch (error) {
      console.error("Error in save:", error);
      throw error;
    }
  }

  async findMany(
    params: Partial<
      Omit<PaginationParams, "page" | "perPage"> & {
        select?: Record<string, any> | string[];
        include?: Record<string, any>;
        orderBy?: any;
        filters?: Record<string, any[]>;
        sort?: { column: string; direction: "asc" | "desc" } | null;
      }
    > = {}
  ): Promise<T[]> {
    let queryParams = { ...params };

    // Add deleted_at filter to where clause
    queryParams.where = {
      ...queryParams.where,
      deleted_at: null,
    };

    // Handle filters
    if (queryParams.filters && Object.keys(queryParams.filters).length > 0) {
      for (const [column, values] of Object.entries(queryParams.filters)) {
        if (Array.isArray(values) && values.length > 0) {
          // Add filter to where clause
          queryParams.where[column] = {
            in: values,
          };
        }
      }
    }

    // Handle sorting
    if (queryParams.sort && queryParams.sort.column) {
      queryParams.orderBy = {
        [queryParams.sort.column]: queryParams.sort.direction,
      };
    }

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

    // Remove custom parameters that Prisma doesn't understand
    const findManyParams = { ...queryParams };
    delete findManyParams.filters;
    delete findManyParams.sort;

    return this.prismaTable.findMany({
      ...findManyParams,
      select: enhancedSelect,
    }) as Promise<T[]>;
  }

  async findList(
    params: Partial<
      PaginationParams & {
        select?: Record<string, any> | string[];
        include?: Record<string, any>;
        orderBy?: any;
        filters?: Record<string, any[]>;
        sort?: { column: string; direction: "asc" | "desc" } | null;
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

    // Handle filters
    if (queryParams.filters && Object.keys(queryParams.filters).length > 0) {
      for (const [column, values] of Object.entries(queryParams.filters)) {
        if (Array.isArray(values) && values.length > 0) {
          // Add filter to where clause
          queryParams.where[column] = {
            in: values,
          };
        }
      }
    }

    // Handle sorting
    if (queryParams.sort && queryParams.sort.column) {
      queryParams.orderBy = {
        [queryParams.sort.column]: queryParams.sort.direction,
      };
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

    const findManyParams = {
      ...queryParams,
      select: enhancedSelect,
      skip,
      take: perPage,
    };

    // Remove custom parameters that Prisma doesn't understand
    delete findManyParams.filters;
    delete findManyParams.sort;

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

    // Clone the data to avoid modifying the original
    const dataToSave = { ...data };
    const relations: Record<string, any> = {};

    // Extract relations from data
    if (this.state.config.relations) {
      for (const [key, relationConfig] of Object.entries(
        this.state.config.relations
      )) {
        if (
          key in dataToSave &&
          dataToSave[key] !== null &&
          typeof dataToSave[key] === "object"
        ) {
          // Store the relation data
          relations[key] = dataToSave[key];
          // Remove the relation from the data to be saved
          delete dataToSave[key];
        }
      }
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

    // Create with main data first
    const result = await this.prismaTable.create({
      data: dataToSave,
      select: enhancedSelect,
    });

    // Then update with relations if any
    if (Object.keys(relations).length > 0 && result.id) {
      const relationData = this.prepareRelationConnect(relations);
      return this.prismaTable.update({
        where: { id: result.id },
        data: relationData,
        select: enhancedSelect,
      }) as Promise<T>;
    }

    return result as Promise<T>;
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
          // Only keep id field for relation connection
          result[key] = {
            connect: { id: relationData.id },
          };
        }
      }
      // Handle hasMany relations
      else if (relation.type === "hasMany") {
        if (Array.isArray(relationData)) {
          // Only keep id field for each relation connection
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

    // Clone the data to avoid modifying the original
    const dataToSave = { ...data };
    const relations: Record<string, any> = {};

    // Extract relations from data
    if (this.state.config.relations) {
      for (const [key, relationConfig] of Object.entries(
        this.state.config.relations
      )) {
        if (
          key in dataToSave &&
          dataToSave[key] !== null &&
          typeof dataToSave[key] === "object"
        ) {
          // Store the relation data
          relations[key] = dataToSave[key];
          // Remove the relation from the data to be saved
          delete dataToSave[key];
        }
      }
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

    // Update main data
    const result = await this.prismaTable.update({
      select: enhancedSelect,
      data: dataToSave,
      where,
    });

    // Then update relations if any
    if (Object.keys(relations).length > 0) {
      const relationData = this.prepareRelationConnect(relations);
      return this.prismaTable.update({
        select: enhancedSelect,
        data: relationData,
        where,
      }) as Promise<T>;
    }

    return result as Promise<T>;
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
      // Clone the data to avoid modifying the original
      const dataToSave = { ...data };
      const relations: Record<string, any> = {};

      // Extract relations from data
      if (this.state.config.relations) {
        for (const [key, relationConfig] of Object.entries(
          this.state.config.relations
        )) {
          if (
            key in dataToSave &&
            dataToSave[key] !== null &&
            typeof dataToSave[key] === "object"
          ) {
            // Store the relation data
            relations[key] = dataToSave[key];
            // Remove the relation from the data to be saved
            delete dataToSave[key];
          }
        }
      }

      // Update main data
      const result = await this.prismaTable.updateMany({
        where,
        data: {
          ...dataToSave,
          updated_at: new Date(),
        },
      });

      // Then update relations if any
      if (Object.keys(relations).length > 0) {
        const relationData = this.prepareRelationConnect(relations);
        // Note: updateMany doesn't support relations, so we need to update each record individually
        const records = await this.prismaTable.findMany({
          where,
          select: { id: true },
        });
        await Promise.all(
          records.map((record: { id: string }) =>
            this.prismaTable.update({
              where: { id: record.id },
              data: relationData,
            })
          )
        );
      }

      return { count: result.count };
    } catch (error) {
      console.error("Error in updateMany:", error);
      throw error;
    }
  }

  /**
   * Save multiple records at once, handling both creation and updates
   */
  async saveMany(records: Partial<T>[]): Promise<Partial<T>[]> {
    try {
      const results: Partial<T>[] = [];
      const primaryKey = this.state.config.primaryKey || "id";

      // Process each record sequentially to maintain order
      for (const data of records) {
        // Clone the data to avoid modifying the original
        const dataToSave = { ...data };
        const relations: Record<string, any> = {};

        // Extract relations from data
        if (this.state.config.relations) {
          for (const [key, relationConfig] of Object.entries(
            this.state.config.relations
          )) {
            if (
              key in dataToSave &&
              dataToSave[key] !== null &&
              typeof dataToSave[key] === "object"
            ) {
              // Store the relation data
              relations[key] = dataToSave[key];
              // Remove the relation from the data to be saved
              delete dataToSave[key];
            }
          }
        }

        let result;

        // Determine whether to update or create
        if (dataToSave[primaryKey]) {
          // If primary key exists, use update
          result = await this.prismaTable.update({
            data: dataToSave,
            where: { [primaryKey]: dataToSave[primaryKey] },
          });
        } else {
          // If no primary key, create new record
          result = await this.prismaTable.create({
            data: dataToSave,
          });
        }

        // Process relations if any
        if (Object.keys(relations).length > 0 && result[primaryKey]) {
          // Prepare relation data with proper connect syntax
          const relationData = this.prepareRelationConnect(relations);

          // Update the record with relation connections
          result = await this.prismaTable.update({
            data: relationData,
            where: { [primaryKey]: result[primaryKey] },
          });
        }

        results.push(result);
      }

      return results;
    } catch (error) {
      console.error("Error in saveMany:", error);
      throw error;
    }
  }
}
