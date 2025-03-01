/**
 * Cache provider interface for model caching
 */
export interface CacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  clear(pattern?: string): Promise<void>;
}

/**
 * In-memory cache provider implementation
 */
class InMemoryCache implements CacheProvider {
  private cache = new Map<string, { value: any; timestamp: number; ttl?: number }>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check TTL
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl * 1000) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl,
    });
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(pattern?: string): Promise<void> {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  enabled: boolean;
  ttl: number; // Time to live in seconds
  provider: CacheProvider;
  queryMaxAge?: number; // Maximum age for query caches before verification (in seconds)
  recordMaxAge?: number; // Maximum age for record caches before verification (in seconds)
}

/**
 * Default cache configuration
 */
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  enabled: true,
  ttl: 300, // 5 minutes
  provider: new InMemoryCache(),
  queryMaxAge: 30, // 30 seconds for queries to be considered fresh without verification
  recordMaxAge: 60, // 60 seconds for records to be considered fresh without verification
};

/**
 * Cache manager for handling model caching operations
 */
export class CacheManager {
  private config: CacheConfig;
  private modelName: string;

  constructor(modelName: string, config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    this.modelName = modelName;
  }

  private getRecordKey(id: string): string {
    return `${this.modelName}:record:${id}`;
  }

  private getQueryKey(params: any): string {
    return `${this.modelName}:query:${JSON.stringify(params)}`;
  }

  async getRecord<T>(id: string): Promise<T | null> {
    if (!this.config.enabled) return null;
    return this.config.provider.get<T>(this.getRecordKey(id));
  }

  async setRecord<T>(id: string, data: T): Promise<void> {
    if (!this.config.enabled) return;
    await this.config.provider.set(this.getRecordKey(id), data, this.config.ttl);
  }

  async getQuery<T>(params: any): Promise<string[] | null> {
    if (!this.config.enabled) return null;
    const result = await this.config.provider.get<{ ids: string[], meta?: any, timestamp: number }>(this.getQueryKey(params));
    return result ? result.ids : null;
  }

  async getQueryWithMeta<T>(params: any): Promise<{ ids: string[], meta: any, timestamp: number, fresh: boolean } | null> {
    if (!this.config.enabled) return null;
    const result = await this.config.provider.get<{ ids: string[], meta: any, timestamp: number }>(this.getQueryKey(params));
    if (!result) return null;
    
    // Determine if the cache is still fresh based on queryMaxAge
    const ageInSeconds = (Date.now() - result.timestamp) / 1000;
    const fresh = ageInSeconds < (this.config.queryMaxAge || DEFAULT_CACHE_CONFIG.queryMaxAge!);
    
    return { ...result, fresh };
  }

  async setQuery(params: any, recordIds: string[], meta?: any): Promise<void> {
    if (!this.config.enabled) return;
    const cacheData = { 
      ids: recordIds, 
      ...(meta ? { meta } : {}),
      timestamp: Date.now()
    };
    await this.config.provider.set(this.getQueryKey(params), cacheData, this.config.ttl);
  }

  async invalidateRecord(id: string): Promise<void> {
    if (!this.config.enabled) return;
    await this.config.provider.del(this.getRecordKey(id));
  }

  async invalidateQuery(params: any): Promise<void> {
    if (!this.config.enabled) return;
    await this.config.provider.del(this.getQueryKey(params));
  }

  /**
   * Invalidates all query caches for this model, preserving individual record caches.
   * This is more efficient than invalidating all caches when you only need to refresh query results.
   */
  async invalidateAllQueries(): Promise<void> {
    if (!this.config.enabled) return;
    // Use pattern matching to only clear query keys
    await this.config.provider.clear(`${this.modelName}:query:`);
  }

  /**
   * Invalidates all caches (both records and queries) for this model.
   */
  async invalidateAll(): Promise<void> {
    if (!this.config.enabled) return;
    await this.config.provider.clear(`${this.modelName}:`);
  }
}
