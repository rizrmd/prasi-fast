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
  private cache = new Map<
    string,
    { value: any; timestamp: number; ttl?: number }
  >();

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
 * Enhanced record cache structure that includes relation information
 */
export interface EnhancedRecordCache<T> {
  data: T;
  queryParams?: any; // Store the original query parameters including relations
  timestamp: number;
}

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
    const cached = await this.config.provider.get<EnhancedRecordCache<T>>(
      this.getRecordKey(id)
    );
    console.log(
      `[CacheManager] getRecord ${id}:`,
      cached ? "found" : "not found"
    );
    return cached ? cached.data : null;
  }

  async getRecordWithParams<T>(
    id: string
  ): Promise<{ data: T; queryParams?: any } | null> {
    if (!this.config.enabled) return null;
    const cached = await this.config.provider.get<EnhancedRecordCache<T>>(
      this.getRecordKey(id)
    );
    console.log(
      `[CacheManager] getRecordWithParams ${id}:`,
      cached ? "found" : "not found"
    );
    if (cached) {
      console.log(
        `[CacheManager] Record ${id} has queryParams:`,
        !!cached.queryParams
      );
      if (cached.queryParams) {
        console.log(
          `[CacheManager] Record ${id} queryParams:`,
          JSON.stringify(cached.queryParams)
        );
      }
    }
    return cached
      ? { data: cached.data, queryParams: cached.queryParams }
      : null;
  }

  async setRecord<T>(id: string, data: T, queryParams?: any): Promise<void> {
    if (!this.config.enabled) return;
    console.log(
      `[CacheManager] setRecord ${id} with queryParams:`,
      !!queryParams
    );
    if (queryParams) {
      console.log(
        `[CacheManager] setRecord ${id} queryParams:`,
        JSON.stringify(queryParams)
      );
    }
    const enhancedCache: EnhancedRecordCache<T> = {
      data,
      queryParams,
      timestamp: Date.now(),
    };
    await this.config.provider.set(
      this.getRecordKey(id),
      enhancedCache,
      this.config.ttl
    );
  }

  async getQuery<T>(params: any): Promise<string[] | null> {
    if (!this.config.enabled) return null;
    const result = await this.config.provider.get<{
      ids: string[];
      meta?: any;
      timestamp: number;
    }>(this.getQueryKey(params));
    console.log(
      `[CacheManager] getQuery:`,
      result ? `found ${result.ids.length} ids` : "not found"
    );
    return result ? result.ids : null;
  }

  async getQueryWithMeta<T>(
    params: any
  ): Promise<{
    ids: string[];
    meta: any;
    timestamp: number;
    fresh: boolean;
    queryParams: any;
  } | null> {
    if (!this.config.enabled) return null;
    const key = this.getQueryKey(params);
    console.log(`[CacheManager] getQueryWithMeta key:`, key);
    const result = await this.config.provider.get<{
      ids: string[];
      meta: any;
      timestamp: number;
      queryParams: any;
    }>(key);
    console.log(
      `[CacheManager] getQueryWithMeta:`,
      result ? `found ${result.ids.length} ids` : "not found"
    );
    if (!result) return null;

    // Determine if the cache is still fresh based on queryMaxAge
    const ageInSeconds = (Date.now() - result.timestamp) / 1000;
    const fresh =
      ageInSeconds <
      (this.config.queryMaxAge || DEFAULT_CACHE_CONFIG.queryMaxAge!);

    console.log(
      `[CacheManager] Query has stored queryParams:`,
      !!result.queryParams
    );
    if (result.queryParams) {
      console.log(
        `[CacheManager] Query stored queryParams:`,
        JSON.stringify(result.queryParams)
      );
    }

    return { ...result, fresh, queryParams: result.queryParams || params };
  }

  async setQuery(params: any, recordIds: string[], meta?: any): Promise<void> {
    if (!this.config.enabled) return;
    console.log(
      `[CacheManager] setQuery with ${recordIds.length} ids and params:`,
      JSON.stringify(params)
    );
    const cacheData = {
      ids: recordIds,
      ...(meta ? { meta } : {}),
      timestamp: Date.now(),
      queryParams: params,
    };
    await this.config.provider.set(
      this.getQueryKey(params),
      cacheData,
      this.config.ttl
    );
  }

  async invalidateRecord(id: string): Promise<void> {
    if (!this.config.enabled) return;
    console.log(`[CacheManager] invalidateRecord ${id}`);
    await this.config.provider.del(this.getRecordKey(id));
  }

  async invalidateQuery(params: any): Promise<void> {
    if (!this.config.enabled) return;
    console.log(
      `[CacheManager] invalidateQuery with params:`,
      JSON.stringify(params)
    );
    await this.config.provider.del(this.getQueryKey(params));
  }

  /**
   * Invalidates all query caches for this model, preserving individual record caches.
   * This is more efficient than invalidating all caches when you only need to refresh query results.
   */
  async invalidateAllQueries(): Promise<void> {
    if (!this.config.enabled) return;
    console.log(
      `[CacheManager] invalidateAllQueries for model ${this.modelName}`
    );
    // Use pattern matching to only clear query keys
    await this.config.provider.clear(`${this.modelName}:query:`);
  }

  /**
   * Invalidates all caches (both records and queries) for this model.
   */
  async invalidateAll(): Promise<void> {
    if (!this.config.enabled) return;
    console.log(`[CacheManager] invalidateAll for model ${this.modelName}`);
    await this.config.provider.clear(`${this.modelName}:`);
  }
}
