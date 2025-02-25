import { Cache, cache as globalCache } from "../cache";

interface ListParams {
  page?: number;
  perPage?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  where?: Record<string, any>;
  search?: string;
}

interface ListCacheResult {
  ids: string[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

interface CachedRecord {
  fields: Set<string>;
  data: Record<string, any>;
}

interface RelationCache {
  [relationName: string]: number[] | number | null;
}

export class ModelCache {
  private cache: Cache;

  constructor() {
    this.cache = globalCache;
  }

  // Record operations
  cacheRecord(tableName: string, id: string, record: Record<string, any>, fields: string[], ttl: number): void {
    const recordData = this.stripRelations(record);
    const key = this.getRecordKey(tableName, id);
    const existing = this.cache.get<CachedRecord>(key);
    
    if (existing) {
      // Merge new data while preserving existing fields
      const mergedFields = new Set([...existing.fields, ...fields]);
      const mergedData = { ...existing.data, ...recordData };
      this.cache.set(key, { fields: mergedFields, data: mergedData }, ttl);
    } else {
      // New record
      this.cache.set(key, { fields: new Set(fields), data: recordData }, ttl);
    }
  }

  getCachedRecord(tableName: string, id: string, requiredFields?: string[]): Record<string, any> | null {
    const cached = this.cache.get<CachedRecord>(this.getRecordKey(tableName, id));
    if (!cached) return null;
    
    // If no specific fields required, return all cached data
    if (!requiredFields) return cached.data;
    
    // Check if all required fields are cached
    const hasAllFields = requiredFields.every(field => cached.fields.has(field));
    return hasAllFields ? cached.data : null;
  }

  // Relation operations  
  cacheRelationIds(
    tableName: string, 
    id: string, 
    relationName: string, 
    ids: number[] | number | null,
    ttl: number
  ): void {
    const key = this.getRelationsKey(tableName, id);
    const existing = this.cache.get<RelationCache>(key) || {};
    this.cache.set(key, { ...existing, [relationName]: ids }, ttl);
  }

  getCachedRelationIds(
    tableName: string,
    id: string,
    relationName: string
  ): number[] | number | null {
    const relations = this.cache.get<RelationCache>(this.getRelationsKey(tableName, id));
    return relations?.[relationName] ?? null;
  }

  // List operations
  cacheList(tableName: string, params: ListParams, result: ListCacheResult, ttl: number): void {
    const key = this.getListKey(tableName, params);
    this.cache.set(key, result, ttl);
  }

  getCachedList(tableName: string, params: ListParams): ListCacheResult | null {
    return this.cache.get<ListCacheResult>(this.getListKey(tableName, params));
  }

  // Invalidation
  invalidateModel(tableName: string): void {
    this.cache.invalidatePattern(new RegExp(`^${tableName}:`));
  }

  invalidateRecord(tableName: string, id: string): void {
    // Invalidate record and its relations
    this.cache.delete(this.getRecordKey(tableName, id));
    this.cache.delete(this.getRelationsKey(tableName, id));
    
    // Also need to invalidate lists as they might contain this record's ID
    this.cache.invalidatePattern(new RegExp(`^${tableName}:list:`));
  }

  // Private helpers
  private stripRelations(record: Record<string, any>): Record<string, any> {
    const result = { ...record };
    for (const [key, value] of Object.entries(result)) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        delete result[key];
      }
    }
    return result;
  }

  private getRecordKey(tableName: string, id: string): string {
    return `${tableName}:${id}`;
  }

  private getRelationsKey(tableName: string, id: string): string {
    return `${tableName}:${id}:relations`;
  }

  private getListKey(tableName: string, params: ListParams): string {
    const normalizedParams = {
      page: params.page || 1,
      perPage: params.perPage || 10,
      orderBy: params.orderBy || 'id',
      orderDirection: params.orderDirection || 'desc',
      where: params.where || {},
      search: params.search || ''
    };
    return `${tableName}:list:${JSON.stringify(normalizedParams)}`;
  }
}
