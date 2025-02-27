import type { BaseRecord } from "../model-base";
import type { ModelState } from "../../model";
import { ModelCache } from "../model-cache";

// Extend existing ModelConfig from types
import type { ModelConfig as BaseModelConfig } from "../../../types";
interface ModelConfig extends BaseModelConfig {
  debug?: boolean;
}

// Define a clean interface for friend methods
export interface CacheManagerFriend {
  initializeCache(cache: ModelCache): void;
  invalidateCache(): void;
  cacheRecordAndRelations(
    record: Record<string, any>,
    select?: Record<string, any>
  ): Promise<void>;
  attachCachedRelations(
    record: Record<string, any>
  ): Promise<Record<string, any>>;
}

// Extend ModelState to use our extended ModelConfig
interface ExtendedModelState<T extends BaseRecord>
  extends Omit<ModelState<T>, "config"> {
  config: ModelConfig;
}

export class ModelCacheManager<T extends BaseRecord = any> {
  // Will be defined by Model class using our extended state type
  protected state!: ExtendedModelState<T>;
  private cache?: ModelCache;

  private debugLog(message: string, ...args: any[]) {
    if (this.state?.config?.debug) {
      console.log(`[Cache Manager] ${message}`, ...args);
    }
  }

  private errorLog(message: string, error: unknown) {
    console.error(`[Cache Manager] ${message}`, error);
  }

  // Expose friend methods for internal use
  private friendMethods: CacheManagerFriend = {
    initializeCache: (cache: ModelCache): void => {
      this.cache = cache;
      this.debugLog(`Initialized for model ${this.state?.config?.modelName}`);
    },

    invalidateCache: (id?: string): void => {
      if (!this.isCachingEnabled()) return;

      const modelName = this.state?.config?.modelName;
      if (!modelName) return;

      this.debugLog(`Invalidating cache for ${modelName} ${id || ""}`);

      try {
        this.cache?.invalidate(modelName, id);
      } catch (error) {
        this.errorLog(`Invalidation error for ${modelName} ${id || ""}:`, error);
      }
    },

    cacheRecordAndRelations: async (
      record: Record<string, any>,
      select?: Record<string, any>
    ): Promise<void> => {
      if (!this.isCachingEnabled() || !record?.id) {
        return Promise.resolve();
      }

      const modelName = this.state?.config?.modelName;
      const ttl = this.state?.config?.cache?.ttl || 60;

      if (!modelName) {
        return Promise.resolve();
      }

      try {
        // Cache the main record
        this.cache?.cacheRecord(modelName, record.id, record, ttl);

        // Cache relation IDs if any are selected
        if (select) {
          for (const [relationName, relationSelect] of Object.entries(select)) {
            if (typeof relationSelect !== 'object') continue;

            const relationData = record[relationName];
            if (relationData === undefined) continue;

            const relationIds = Array.isArray(relationData)
              ? relationData.map((r: Record<string, any>) => r.id)
              : (relationData as Record<string, any>)?.id || null;

            this.cache?.cacheRelationIds(
              modelName,
              record.id,
              relationName,
              relationIds,
              ttl
            );
          }
        }

        this.debugLog(
          `Cached record and relations for ${modelName}:${record.id}`
        );
        return Promise.resolve();
      } catch (error) {
        this.errorLog(`Cache error for ${modelName}:${record.id}:`, error);
        return Promise.reject(error);
      }
    },

    attachCachedRelations: async (
      record: Record<string, any>
    ): Promise<Record<string, any>> => {
      if (!this.isCachingEnabled() || !record?.id) {
        return Promise.resolve(record);
      }

      const modelName = this.state?.config?.modelName;
      if (!modelName) {
        return Promise.resolve(record);
      }

      try {
        // Get all cached relation IDs for this record
        const relations = this.cache?.getCachedRecord(modelName, record.id);
        if (!relations) {
          return Promise.resolve(record);
        }

        const result = { ...record };

        // For each relation with cached IDs, try to get the related records from cache
        for (const [relationName, relationData] of Object.entries(relations)) {
          if (!relationData) continue;

          const ids = Array.isArray(relationData)
            ? relationData
            : [relationData];
          const cachedRelations = await Promise.all(
            ids.map(async (id: string) => {
              const cached = await this.cache?.getCachedRecord(
                relationName,
                id
              );
              return cached;
            })
          );

          // Only attach relations if all related records are cached
          if (cachedRelations.every((r) => r !== null)) {
            result[relationName] = Array.isArray(relationData)
              ? cachedRelations
              : cachedRelations[0];
          }
        }

        return Promise.resolve(result);
      } catch (error) {
        this.errorLog(
          `Error attaching relations for ${modelName}:${record.id}:`,
          error
        );
        return Promise.resolve(record);
      }
    },
  };

  get _friend(): CacheManagerFriend {
    return this.friendMethods;
  }

  async get(id: string): Promise<T | null> {
    if (!this.isCachingEnabled() || !this.state?.config?.modelName) return null;

    const cached = this.cache?.get<T>(this.state.config.modelName, id);
    this.debugLog(
      `${cached ? "HIT" : "MISS"} for ${this.state.config.modelName}:${id}`
    );
    return cached || null;
  }

  async set(id: string, data: T): Promise<void> {
    if (!this.isCachingEnabled() || !this.state?.config?.modelName) return;

    this.debugLog(`Setting cache for ${this.state.config.modelName}:${id}`);
    this.cache?.set(
      this.state.config.modelName,
      id,
      data,
      this.state?.config?.cache?.ttl || 60
    );
  }

  private isCachingEnabled(): boolean {
    const enabled =
      this.state?.mode === "client" &&
      !!this.state?.config?.cache?.ttl &&
      !!this.cache;

    this.debugLog(
      `Status:`,
      `Model=${this.state?.config?.modelName},`,
      `Mode=${this.state?.mode},`,
      `TTL=${this.state?.config?.cache?.ttl},`,
      `Cache=${!!this.cache},`,
      `Enabled=${enabled}`
    );

    return enabled;
  }
}
