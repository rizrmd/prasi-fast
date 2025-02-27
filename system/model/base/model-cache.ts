export type CacheEntry<T = any> = {
  value: T;
  expiry: number;
  fields?: Set<string>;
  data?: Record<string, any>;
};

type CacheValue =
  | CachedRecord
  | RelationCache
  | ListCacheResult
  | string[]
  | Record<string, any>;

interface ListParams {
  page?: number;
  perPage?: number;
  orderBy?: string;
  orderDirection?: "asc" | "desc";
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
  private cache = new Map<string, CacheEntry<CacheValue>>();
  private debug: boolean;

  constructor(debug = false) {
    this.debug = debug;
    if (debug) console.log("ModelCache initialized with debug mode enabled");
  }

  private getCacheKey(modelName: string, id: string): string {
    return `${modelName}:${id}`;
  }

  get<T>(modelName: string, id: string): T | null {
    if (typeof id !== "string") {
      if (this.debug) console.log(`Cache MISS: ${JSON.stringify(id)}`);
      return null;
    }

    const key = this.getCacheKey(modelName, id);
    const entry = this.cache.get(key);

    if (!entry) {
      if (this.debug) console.log(`Cache MISS: ${JSON.stringify(key)}`);
      return null;
    }

    // Check if entry is expired
    if (entry.expiry < Date.now()) {
      if (this.debug) console.log(`Cache EXPIRED: ${JSON.stringify(key)}`);
      this.cache.delete(key);
      return null;
    }

    if (this.debug) console.log(`Cache HIT: ${JSON.stringify(key)}`);
    return entry.value as T;
  }

  set<T extends CacheValue>(
    modelName: string,
    id: string,
    value: T,
    ttlSeconds: number
  ): void {
    try {
      console.log("set", value);

      const key = this.getCacheKey(modelName, id);
      const expiry = Date.now() + ttlSeconds * 1000;

      this.cache.set(key, { value, expiry });
      if (this.debug)
        console.log(`Cache SET: ${key}, expires in ${ttlSeconds}s`);
    } catch (error) {
      console.error(`Cache set error for ${modelName}:${id}:`, error);
    }
  }

  invalidate(modelName: string, id?: string): void {
    try {
      if (id) {
        // Invalidate specific record
        const key = this.getCacheKey(modelName, id);
        const deleted = this.cache.delete(key);
        if (this.debug) {
          console.log(
            `Cache INVALIDATE ${deleted ? "SUCCESS" : "MISS"}: ${key}`
          );
        }
      } else {
        // Invalidate all records of this model using prefix
        const prefix = `${modelName}:`;
        let count = 0;
        for (const key of this.cache.keys()) {
          if (key.startsWith(prefix)) {
            this.cache.delete(key);
            count++;
          }
        }
        if (this.debug) {
          console.log(
            `Cache INVALIDATE ALL: ${count} entries for model ${modelName}`
          );
        }
      }
    } catch (error) {
      console.error(`Cache invalidation error for ${modelName}:`, error);
    }
  }

  clear(): void {
    this.cache.clear();
    if (this.debug) console.log("Cache CLEAR: Complete cache cleared");
  }

  // Record operations
  async cacheRecord(
    tableName: string,
    id: string,
    record: Record<string, any>,
    ttl: number
  ): Promise<void> {
    try {
      const recordData = this.stripRelations(record);
      const key = this.getRecordKey(tableName, id);
      const existing = this.cache.get(key);

      const entry: CacheEntry<Record<string, any>> = existing
        ? {
            value: { ...(existing.value as CachedRecord).data, ...recordData },
            expiry: Date.now() + ttl * 1000,
          }
        : {
            value: recordData,
            expiry: Date.now() + ttl * 1000,
          };

      await Promise.resolve(this.cache.set(key, entry));
    } catch (error) {
      console.error(`Cache record error for ${tableName}:${id}:`, error);
      throw error;
    }
  }

  getCachedRecord(
    tableName: string,
    id: string,
    requiredFields?: string[]
  ): Record<string, any> | null {
    try {
      const cached = this.cache.get(this.getRecordKey(tableName, id));
      if (!cached) return null;

      const record = cached.value as CachedRecord;

      // If no specific fields required, return all cached data
      if (!requiredFields) return record.data;

      // Check if all required fields are cached
      const hasAllFields = requiredFields.every((field) =>
        record.fields.has(field)
      );
      return hasAllFields ? record.data : null;
    } catch (error) {
      console.error(`Get cached record error for ${tableName}:${id}:`, error);
      return null;
    }
  }

  // Relation operations
  async cacheRelationIds(
    tableName: string,
    id: string,
    relationName: string,
    ids: number[] | number | null,
    ttl: number
  ): Promise<void> {
    try {
      const key = this.getRelationsKey(tableName, id);
      const existing = this.cache.get(key);
      const currentRelations = (existing?.value as RelationCache) || {};

      await Promise.resolve(
        this.cache.set(key, {
          value: { ...currentRelations, [relationName]: ids },
          expiry: Date.now() + ttl * 1000,
        })
      );

      if (this.debug) {
        console.log(
          `Cached relation IDs for ${tableName}:${id}:${relationName}`
        );
      }
    } catch (error) {
      console.error(
        `Cache relation error for ${tableName}:${id}:${relationName}:`,
        error
      );
      throw error;
    }
  }

  getCachedRelationIds(
    tableName: string,
    id: string,
    relationName: string
  ): number[] | number | null {
    try {
      const cached = this.cache.get(this.getRelationsKey(tableName, id));
      if (!cached) return null;

      const relations = cached.value as RelationCache;
      return relations[relationName] ?? null;
    } catch (error) {
      console.error(
        `Get cached relation error for ${tableName}:${id}:${relationName}:`,
        error
      );
      return null;
    }
  }

  // List operations
  cacheList(
    tableName: string,
    params: ListParams,
    result: ListCacheResult,
    ttl: number
  ): void {
    try {
      const key = this.getListKey(tableName, params);
      this.cache.set(key, {
        value: result,
        expiry: Date.now() + ttl * 1000,
      });

      if (this.debug) {
        console.log(`Cached list for ${tableName} with params:`, params);
      }
    } catch (error) {
      console.error(`Cache list error for ${tableName}:`, error);
    }
  }

  getCachedList(tableName: string, params: ListParams): ListCacheResult | null {
    try {
      const cached = this.cache.get(this.getListKey(tableName, params));
      return cached ? (cached.value as ListCacheResult) : null;
    } catch (error) {
      console.error(`Get cached list error for ${tableName}:`, error);
      return null;
    }
  }

  // Invalidation with pattern support
  private invalidatePattern(pattern: RegExp): void {
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        if (this.debug) console.log(`Pattern invalidated: ${key}`);
      }
    }
  }

  invalidateModel(tableName: string): void {
    try {
      this.invalidatePattern(new RegExp(`^${tableName}:`));
      if (this.debug)
        console.log(`Invalidated all entries for model: ${tableName}`);
    } catch (error) {
      console.error(`Model invalidation error for ${tableName}:`, error);
    }
  }

  invalidateRecord(tableName: string, id: string): void {
    try {
      // Invalidate record and its relations
      this.cache.delete(this.getRecordKey(tableName, id));
      this.cache.delete(this.getRelationsKey(tableName, id));

      // Also need to invalidate lists as they might contain this record's ID
      this.invalidatePattern(new RegExp(`^${tableName}:list:`));

      if (this.debug) {
        console.log(
          `Invalidated record and related entries for ${tableName}:${id}`
        );
      }
    } catch (error) {
      console.error(`Record invalidation error for ${tableName}:${id}:`, error);
    }
  }

  // Private helpers
  private stripRelations(record: Record<string, any>): Record<string, any> {
    const result = { ...record };
    for (const [key, value] of Object.entries(result)) {
      if (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
      ) {
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
      orderBy: params.orderBy || "id",
      orderDirection: params.orderDirection || "desc",
      where: params.where || {},
      search: params.search || "",
    };
    return `${tableName}:list:${JSON.stringify(normalizedParams)}`;
  }

  private getIdsKey(
    tableName: string,
    params: Omit<ListParams, "page" | "perPage">
  ): string {
    const normalizedParams = {
      orderBy: params.orderBy || "id",
      orderDirection: params.orderDirection || "desc",
      where: params.where || {},
      search: params.search || "",
    };
    return `${tableName}:ids:${JSON.stringify(normalizedParams)}`;
  }

  // Non-paginated list operations
  cacheIds(
    tableName: string,
    params: Omit<ListParams, "page" | "perPage">,
    ids: string[],
    ttl: number
  ): void {
    try {
      const key = this.getIdsKey(tableName, params);
      this.cache.set(key, {
        value: ids,
        expiry: Date.now() + ttl * 1000,
      });

      if (this.debug) {
        console.log(`Cached IDs for ${tableName} with params:`, params);
      }
    } catch (error) {
      console.error(`Cache IDs error for ${tableName}:`, error);
    }
  }

  getCachedIds(
    tableName: string,
    params: Omit<ListParams, "page" | "perPage">
  ): string[] | null {
    try {
      const cached = this.cache.get(this.getIdsKey(tableName, params));
      return cached ? (cached.value as string[]) : null;
    } catch (error) {
      console.error(`Get cached IDs error for ${tableName}:`, error);
      return null;
    }
  }

  // Enhanced debugging methods
  dumpStatus(): void {
    const now = Date.now();
    const total = this.cache.size;
    let expired = 0;
    let valid = 0;

    console.log(`\nCache Status Report`);
    console.log(`Total entries: ${total}`);

    this.cache.forEach((entry, key) => {
      const timeLeft = Math.round((entry.expiry - now) / 1000);
      const status = timeLeft > 0 ? "VALID" : "EXPIRED";

      if (timeLeft > 0) valid++;
      else expired++;

      console.log(`- ${key}:`);
      console.log(`  Status: ${status}`);
      console.log(`  TTL: ${timeLeft}s`);
      console.log(`  Value: ${JSON.stringify(entry.value).slice(0, 100)}...`);
    });

    console.log(`\nSummary:`);
    console.log(`- Valid entries: ${valid}`);
    console.log(`- Expired entries: ${expired}`);
    console.log(`- Cache hit rate: ${this.getHitRate()}%`);
  }

  private hits = 0;
  private misses = 0;

  private getHitRate(): number {
    const total = this.hits + this.misses;
    if (total === 0) return 0;
    return Math.round((this.hits / total) * 100);
  }

  private logCacheAccess(hit: boolean, key: string): void {
    if (hit) this.hits++;
    else this.misses++;
    if (this.debug) {
      console.log(
        `Cache ${
          hit ? "HIT" : "MISS"
        }: ${key} (Hit rate: ${this.getHitRate()}%)`
      );
    }
  }
}
