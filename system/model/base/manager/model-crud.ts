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

  // Helper method to check if a query involves relations
  private queryHasRelations(params: any): boolean {
    // Check for explicit include directive
    if (params.include) {
      console.log(`[queryHasRelations] Found include:`, JSON.stringify(params.include));
      return true;
    }

    // Check if select contains relation fields
    if (params.select) {
      const relations = this.state.config.relations || {};
      const relationKeys = Object.keys(relations);
      console.log(`[queryHasRelations] Relation keys:`, relationKeys);
      
      // If select is an array of field names
      if (Array.isArray(params.select)) {
        const hasRelations = params.select.some((field: string) => relationKeys.includes(field));
        console.log(`[queryHasRelations] Select array has relations:`, hasRelations);
        return hasRelations;
      }
      
      // If select is an object
      if (typeof params.select === 'object') {
        const hasRelations = Object.keys(params.select).some((field: string) => relationKeys.includes(field));
        console.log(`[queryHasRelations] Select object has relations:`, hasRelations);
        return hasRelations;
      }
    }
    
    console.log(`[queryHasRelations] No relations found in query`);
    return false;
  }

  // Helper method to preserve query parameters for relations
  private preserveQueryParams(originalParams: any): any {
    // Create a copy of the original params
    const params = { ...originalParams };
    
    // If there are no relations, return as is
    if (!this.queryHasRelations(params)) {
      return params;
    }
    
    // Store the original include/select for later use
    return params;
  }

  async findFirst(
    idOrParams: string | Partial<PaginationParams & { include?: Record<string, any> }>
  ): Promise<T | null> {
    const isString = typeof idOrParams === "string";
    const stringId = isString ? idOrParams : undefined;
    const params = isString ? { where: { id: stringId } } : idOrParams;
    
    // Preserve original query parameters
    const originalParams = this.preserveQueryParams(params);

    // Check cache for single record lookup
    if (stringId) {
      // Get the record with its stored query parameters
      const cachedWithParams = await this.cacheManager.getRecordWithParams<T>(stringId);
      if (cachedWithParams) {
        const cached = cachedWithParams.data;
        // Use the stored query parameters if available, otherwise use the current params
        const queryParamsForRelations = cachedWithParams.queryParams || originalParams;
        
        // If the query involves relations, we need to fetch those separately
        if (this.queryHasRelations(queryParamsForRelations)) {
          // Check if the cached record already has the required relations
          const relationKeys = this.getRelationKeysFromParams(queryParamsForRelations);
          const recordHasRelations = relationKeys.every(key => 
            key in cached && cached[key] !== null && cached[key] !== undefined
          );
          
          if (!recordHasRelations) {
            // Use the cached record as a base but fetch relations from database
            return this.fetchRelationsForCachedRecord(cached, queryParamsForRelations);
          }
        }
        
        // For queries without relations or if all relations are already cached, return cached data immediately
        // Start background fetch to refresh the cache
        this.refreshRecordInBackground(stringId, params);
        return cached;
      }
    }

    // If not cached or no stringId, query normally
    return this.queryAndCacheRecord(params, stringId);
  }

  // Helper method to fetch relations for a cached record
  private async fetchRelationsForCachedRecord(
    cachedRecord: T,
    params: any
  ): Promise<T> {
    // If there are no relations to fetch, return the cached record as is
    if (!this.queryHasRelations(params)) {
      return cachedRecord;
    }

    // Create a query to fetch just the relations for this record
    const relationQuery = {
      where: { id: cachedRecord.id },
      include: params.include,
      select: params.select
    };

    // Fetch the record with relations
    const recordWithRelations = await this.prismaTable.findFirst(relationQuery);
    
    // If no record found, return the cached record
    if (!recordWithRelations) {
      return cachedRecord;
    }
    
    // Create a new object that combines the cached record with only the relation fields
    // from the fetched record, rather than overwriting everything
    const result: Record<string, any> = { ...cachedRecord };
    
    // Only copy relation fields from recordWithRelations to the result
    const relations = this.state.config.relations || {};
    const relationKeys = Object.keys(relations);
    
    for (const key of relationKeys) {
      if (key in recordWithRelations) {
        result[key] = recordWithRelations[key];
      }
    }
    
    return result as T;
  }

  // Helper method to fetch and cache a record
  private async queryAndCacheRecord(
    params: Partial<PaginationParams & { include?: Record<string, any> }>,
    stringId?: string
  ): Promise<T | null> {
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

    // Cache the base record (without relations)
    if (record && stringId) {
      // Store the complete record with relations
      console.log(`[queryAndCacheRecord] Caching record ${stringId} with params:`, JSON.stringify(params));
      // Store the original query parameters with the record
      await this.cacheManager.setRecord(stringId, record, params);
    }

    return record as T | null;
  }

  // Helper method to extract base record without relations
  private extractBaseRecord(record: any): any {
    if (!record) return record;
    
    const relations = this.state.config.relations || {};
    const relationKeys = Object.keys(relations);
    
    // Create a new object with all properties except relations
    const baseRecord = { ...record };
    
    // Remove relation properties
    for (const key of relationKeys) {
      if (key in baseRecord) {
        delete baseRecord[key];
      }
    }
    
    return baseRecord;
  }

  // Method to refresh a record in the background without blocking
  private refreshRecordInBackground(
    id: string,
    params: Partial<PaginationParams & { include?: Record<string, any> }>
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
    // Preserve original query parameters
    const originalParams = this.preserveQueryParams(params);
    
    // Check cache for record IDs with freshness information
    const cachedResult = await this.cacheManager.getQueryWithMeta(params);

    // Use cache if available
    if (cachedResult && cachedResult.ids.length > 0) {
      // Fetch records from cache
      const records = await Promise.all(
        cachedResult.ids.map(async (id) => {
          const cached = await this.cacheManager.getRecord<T>(id);
          return cached;
        })
      );
      
      // Filter out null values
      const validRecords = records.filter(Boolean) as T[];

      // If we got all records from cache
      if (validRecords.length === cachedResult.ids.length) {
        // If the query involves relations, fetch those separately
        // Use the original stored query parameters from the cache
        const queryParamsForRelations = cachedResult.queryParams || originalParams;
        
        if (this.queryHasRelations(queryParamsForRelations)) {
          // Check if the cached records already have the required relations
          const allRecordsHaveRelations = validRecords.every(record => {
            // Get relation keys from the query parameters
            const relationKeys = this.getRelationKeysFromParams(queryParamsForRelations);
            
            // Check if all required relation keys exist in the record with proper data
            return relationKeys.every(key => {
              // First check if the relation exists at all
              if (!(key in record) || record[key] === null || record[key] === undefined) {
                console.log(`[findMany] Record ${record.id} is missing relation '${key}'`);
                return false;
              }
              
              // For array relations, check if it's populated
              if (Array.isArray(record[key])) {
                const hasData = record[key].length > 0;
                if (!hasData) {
                  console.log(`[findMany] Record ${record.id} has empty relation array for '${key}'`);
                }
                return hasData;
              }
              
              // For object relations, check if it has an ID at minimum
              if (typeof record[key] === 'object') {
                const hasData = record[key] && 'id' in record[key];
                if (!hasData) {
                  console.log(`[findMany] Record ${record.id} has incomplete relation object for '${key}'`);
                }
                return hasData;
              }
              
              return true;
            });
          });
          
          if (!allRecordsHaveRelations) {
            console.log(`[findMany] Fetching relations for cached records`);
            // Fetch relations for all cached records
            const recordsWithRelations = await this.fetchRelationsForCachedRecords(
              validRecords,
              queryParamsForRelations
            );
            
            // If not fresh, refresh in background
            if (!cachedResult.fresh) {
              this.refreshQueryInBackground(params);
            }
            
            return recordsWithRelations;
          }
        }
        
        // For queries without relations or if all relations are already cached, return cached data immediately
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

  // Helper method to fetch relations for multiple cached records
  private async fetchRelationsForCachedRecords(
    cachedRecords: T[],
    params: any
  ): Promise<T[]> {
    // If there are no relations to fetch, return the cached records as is
    if (!this.queryHasRelations(params) || cachedRecords.length === 0) {
      console.log(`[fetchRelationsForCachedRecords] No relations to fetch or empty records`);
      return cachedRecords;
    }

    // Get all record IDs
    const recordIds = cachedRecords.map(record => record.id);
    console.log(`[fetchRelationsForCachedRecords] Fetching relations for ${recordIds.length} records`);
    console.log(`[fetchRelationsForCachedRecords] Using params:`, JSON.stringify({
      include: params.include,
      select: params.select
    }));
    
    // Create a query to fetch just the relations for these records
    let relationQuery: any = {
      where: { id: { in: recordIds } }
    };

    // Handle both include and select cases
    if (params.include) {
      relationQuery.include = params.include;
    } else if (params.select) {
      // When using select, we need to ensure the ID is included
      // and only include the relation fields to minimize the query
      const relations = this.state.config.relations || {};
      const relationKeys = Object.keys(relations);
      
      // Create a select object that only includes relation fields and ID
      const relationSelect: Record<string, any> = { id: true };
      
      for (const key of relationKeys) {
        if (key in params.select) {
          relationSelect[key] = params.select[key];
        }
      }
      
      relationQuery.select = relationSelect;
    }

    // Fetch the records with relations
    const recordsWithRelations = await this.prismaTable.findMany(relationQuery);
    console.log(`[fetchRelationsForCachedRecords] Found ${recordsWithRelations.length} records with relations`);
    
    // Create a map of records by ID for easy lookup
    const recordMap = new Map<string, any>();
    recordsWithRelations.forEach((record: any) => {
      recordMap.set(record.id, record);
    });
    
    // Merge each cached record with its relations
    const result = cachedRecords.map(cachedRecord => {
      const recordWithRelations = recordMap.get(cachedRecord.id);
      if (recordWithRelations) {
        // Create a new object that combines the cached record with only the relation fields
        const result: Record<string, any> = { ...cachedRecord };
        
        // Only copy relation fields from recordWithRelations to the result
        const relations = this.state.config.relations || {};
        const relationKeys = Object.keys(relations);
        
        for (const key of relationKeys) {
          if (key in recordWithRelations) {
            result[key] = recordWithRelations[key];
            console.log(`[fetchRelationsForCachedRecords] Added relation '${key}' to record ${cachedRecord.id}`);
          }
        }
        
        return result as T;
      }
      console.log(`[fetchRelationsForCachedRecords] No relation data found for record ${cachedRecord.id}`);
      return cachedRecord;
    });
    
    return result;
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
      deleted_at: null,
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

    // Execute the query with all parameters including relations
    const results = (await this.prismaTable.findMany({
      ...queryParams,
      select: enhancedSelect,
    })) as T[];

    if (results.length > 0) {
      // Cache record IDs with the query parameters
      console.log(`[queryAndCacheMany] Caching query with ${results.length} records and params:`, JSON.stringify(params));
      await this.cacheManager.setQuery(
        params,
        results.map((record) => record.id)
      );

      // Cache individual records (without relations)
      for (const record of results) {
        if (record.id) {
          // Extract base record without relations
          const baseRecord = this.extractBaseRecord(record);
          console.log(`[queryAndCacheMany] Caching record ${record.id} with params:`, JSON.stringify(params));
          // Store the original query parameters with each record
          await this.cacheManager.setRecord(record.id, baseRecord, params);
        }
      }
    }

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
    // Preserve original query parameters
    const originalParams = this.preserveQueryParams(params);
    console.log(`[findList] Original params:`, JSON.stringify(originalParams));
    
    // Check cache for record IDs and pagination metadata with freshness information
    const cachedResult = await this.cacheManager.getQueryWithMeta(params);
    console.log(`[findList] Cache hit:`, !!cachedResult);
    
    if (cachedResult && cachedResult.ids.length > 0 && cachedResult.meta) {
      console.log(`[findList] Found ${cachedResult.ids.length} cached IDs`);
      console.log(`[findList] Cached query params:`, JSON.stringify(cachedResult.queryParams));
      
      // Fetch records from cache
      const records = await Promise.all(
        cachedResult.ids.map(async (id) => {
          const cached = await this.cacheManager.getRecord<T>(id);
          return cached;
        })
      );

      // Filter out null records in case some were evicted from cache
      const validRecords = records.filter(Boolean) as T[];
      console.log(`[findList] Valid records from cache: ${validRecords.length}`);

      // If we have all records from cache
      if (validRecords.length === cachedResult.ids.length) {
        // If the query involves relations, fetch those separately
        let finalRecords = validRecords;
        
        // Use the original stored query parameters from the cache
        const queryParamsForRelations = cachedResult.queryParams || originalParams;
        console.log(`[findList] Query has relations:`, this.queryHasRelations(queryParamsForRelations));
        console.log(`[findList] Relation query params:`, JSON.stringify(queryParamsForRelations));
        
        if (this.queryHasRelations(queryParamsForRelations)) {
          // Check if the cached records already have the required relations
          const allRecordsHaveRelations = validRecords.every(record => {
            // Get relation keys from the query parameters
            const relationKeys = this.getRelationKeysFromParams(queryParamsForRelations);
            
            // Check if all required relation keys exist in the record with proper data
            return relationKeys.every(key => {
              // First check if the relation exists at all
              if (!(key in record) || record[key] === null || record[key] === undefined) {
                console.log(`[findList] Record ${record.id} is missing relation '${key}'`);
                return false;
              }
              
              // For array relations, check if it's populated
              if (Array.isArray(record[key])) {
                const hasData = record[key].length > 0;
                if (!hasData) {
                  console.log(`[findList] Record ${record.id} has empty relation array for '${key}'`);
                }
                return hasData;
              }
              
              // For object relations, check if it has an ID at minimum
              if (typeof record[key] === 'object') {
                const hasData = record[key] && 'id' in record[key];
                if (!hasData) {
                  console.log(`[findList] Record ${record.id} has incomplete relation object for '${key}'`);
                }
                return hasData;
              }
              
              return true;
            });
          });
          
          if (!allRecordsHaveRelations) {
            console.log(`[findList] Fetching relations for cached records`);
            // Fetch relations for all cached records
            finalRecords = await this.fetchRelationsForCachedRecords(
              validRecords,
              queryParamsForRelations
            );
          } else {
            console.log(`[findList] All cached records already have the required relations`);
          }
          console.log(`[findList] Records with relations:`, finalRecords.map(r => ({id: r.id, hasRelations: this.hasRelationFields(r)})));
        }
        
        const result = {
          data: finalRecords,
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

    console.log(`[findList] Cache miss or incomplete records, querying database`);
    // If not in cache or incomplete records, query normally
    return this.queryAndCacheList(params);
  }

  // Helper method to check if a record has relation fields
  private hasRelationFields(record: any): boolean {
    if (!record) return false;
    
    const relations = this.state.config.relations || {};
    const relationKeys = Object.keys(relations);
    
    return relationKeys.some(key => key in record && record[key] !== null && record[key] !== undefined);
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
    console.log(`[queryAndCacheList] Querying database with params:`, JSON.stringify({
      select: findManyParams.select,
      include: findManyParams.include
    }));
    
    const [records, count] = await Promise.all([
      this.prismaTable.findMany(findManyParams) as Promise<T[]>,
      this.prismaTable.count({ where: queryParams.where }),
    ]);

    console.log(`[queryAndCacheList] Found ${records.length} records from database`);
    console.log(`[queryAndCacheList] First record has relations:`, records.length > 0 ? this.hasRelationFields(records[0]) : false);

    if (records.length > 0) {
      // Cache record IDs and pagination metadata for this query
      const recordIds = records.map((record) => record.id);
      console.log(`[queryAndCacheList] Caching query with ${recordIds.length} IDs and params:`, JSON.stringify(params));
      await this.cacheManager.setQuery(params, recordIds, {
        page,
        perPage,
        total: count,
        totalPages: Math.ceil(count / perPage),
      });

      // Cache individual records (without relations)
      for (const record of records) {
        if (record.id) {
          // Store the complete record with relations
          console.log(`[queryAndCacheList] Caching record ${record.id}, has relations:`, this.hasRelationFields(record));
          
          // Store the original record with the query parameters
          await this.cacheManager.setRecord(record.id, record, params);
        }
      }
    }

    const result = {
      data: records,
      page,
      perPage,
      total: count,
      totalPages: Math.ceil(count / perPage),
    };

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

    // Prepare the query parameters to include any relations
    const queryParams = {
      select: enhancedSelect,
      include: opt.data ? this.extractRelationsFromData(opt.data) : undefined
    };

    const result = (await this.prismaTable.create({
      data: this.prepareRelationConnect(data),
      select: enhancedSelect,
    })) as T;

    // Add the newly created record to record cache with query parameters
    if (result && result.id) {
      // Store the complete record with relations
      await this.cacheManager.setRecord(result.id, result, queryParams);

      // Invalidate query caches since we have new data that might match existing queries
      // This ensures fresh data will be fetched next time any query is made
      await this.cacheManager.invalidateAllQueries();
    }

    return result;
  }

  // Helper method to extract relation includes from data
  private extractRelationsFromData(data: any): Record<string, boolean> | undefined {
    if (!data || typeof data !== 'object') {
      return undefined;
    }

    const relations = this.state.config.relations;
    if (!relations) {
      return undefined;
    }

    const includes: Record<string, boolean> = {};
    let hasIncludes = false;

    for (const [key, relation] of Object.entries(relations)) {
      if (key in data && data[key]) {
        includes[key] = true;
        hasIncludes = true;
      }
    }

    return hasIncludes ? includes : undefined;
  }

  prepareRelationConnect = (data: any) => {
    if (!data || typeof data !== 'object') {
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
      if (relation.type === 'belongsTo' || relation.type === 'hasOne') {
        if (relationData.id) {
          result[key] = {
            connect: { id: relationData.id }
          };
        }
      }
      // Handle hasMany relations
      else if (relation.type === 'hasMany') {
        if (Array.isArray(relationData)) {
          result[key] = {
            connect: relationData
              .filter(item => item && item.id)
              .map(item => ({ id: item.id }))
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

    // Prepare the query parameters to include any relations
    const queryParams = {
      select: enhancedSelect,
      include: opt.data ? this.extractRelationsFromData(opt.data) : undefined,
      where
    };

    const result = (await this.prismaTable.update({
      select: enhancedSelect,
      data: this.prepareRelationConnect(data),
      where,
    })) as T;

    // Update the record cache with the updated record and invalidate queries
    if (result && result.id) {
      // Store the complete record with relations
      await this.cacheManager.setRecord(result.id, result, queryParams);

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

  // Helper method to extract relation keys from query parameters
  private getRelationKeysFromParams(params: any): string[] {
    const relations = this.state.config.relations || {};
    const allRelationKeys = Object.keys(relations);
    const result: string[] = [];
    
    // Check for relations in include
    if (params.include) {
      for (const key of Object.keys(params.include)) {
        if (allRelationKeys.includes(key)) {
          result.push(key);
        }
      }
    }
    
    // Check for relations in select
    if (params.select && typeof params.select === 'object' && !Array.isArray(params.select)) {
      for (const key of Object.keys(params.select)) {
        if (allRelationKeys.includes(key)) {
          result.push(key);
        }
      }
    }
    
    return result;
  }
}
