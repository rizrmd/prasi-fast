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
}

/**
 * Default cache configuration
 */
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  enabled: true,
  ttl: 300, // 5 minutes
  provider: new InMemoryCache(),
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
    return this.config.provider.get<string[]>(this.getQueryKey(params));
  }

  async setQuery(params: any, recordIds: string[]): Promise<void> {
    if (!this.config.enabled) return;
    await this.config.provider.set(this.getQueryKey(params), recordIds, this.config.ttl);
  }

  async invalidateRecord(id: string): Promise<void> {
    if (!this.config.enabled) return;
    await this.config.provider.del(this.getRecordKey(id));
  }

  async invalidateQuery(params: any): Promise<void> {
    if (!this.config.enabled) return;
    await this.config.provider.del(this.getQueryKey(params));
  }

  async invalidateAll(): Promise<void> {
    if (!this.config.enabled) return;
    await this.config.provider.clear(`${this.modelName}:`);
  }
}
