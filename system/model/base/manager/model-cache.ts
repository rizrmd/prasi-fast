import type { BaseRecord } from "../model-base";

// Extend existing ModelConfig from types
import type { ModelConfig as BaseModelConfig } from "../../../types";

// Helper type for query parameters
interface QueryParams {
  where?: Record<string, any>;
  orderBy?: Record<string, any>;
  select?: Record<string, any> | string[];
}

// Define a clean interface for friend methods
export interface CacheManagerFriend {
  initializeCache(): void;
  invalidateCache(): void;
  cacheRecordAndRelations(
    record: Record<string, any>,
    select?: Record<string, any>
  ): Promise<void>;
  attachCachedRelations(
    record: Record<string, any>
  ): Promise<Record<string, any>>;
}

export class ModelCacheManager<T extends BaseRecord = any> {}
