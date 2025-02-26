import { ModelManager } from "../model-manager";
import type { BaseRecord } from "../model-base";
import { CacheManagerFriend, WithFriends } from "../model-friend";

export class ModelCacheManager<T extends BaseRecord = any> extends ModelManager<T> implements WithFriends<CacheManagerFriend> {
  public readonly _friend: CacheManagerFriend = {
    invalidateCache: this.invalidateCache.bind(this),
    cacheRecordAndRelations: this.cacheRecordAndRelations.bind(this),
    attachCachedRelations: this.attachCachedRelations.bind(this)
  };

  // Helper method to check if caching should be used
  protected shouldUseCache(): boolean {
    return this.state.mode === "client" && !!this.config.cache;
  }

  protected ensurePrimaryKeys(select: Record<string, any>): Record<string, any> {
    // Not needed in cache manager
    throw new Error("Not implemented");
  }

  protected getSelectFields(select?: Record<string, any>): string[] {
    // Not needed in cache manager
    throw new Error("Not implemented");
  }

  protected invalidateCache(): void {
    if (!this.shouldUseCache()) return;

    this.modelCache.invalidateModel(this.config.tableName);

    if (this.config.relations) {
      for (const { model } of Object.values(this.config.relations)) {
        this.modelCache.invalidateModel(model);
      }
    }
  }

  protected async cacheRecordAndRelations(
    record: Record<string, any>,
    select?: Record<string, any>
  ): Promise<void> {
    if (!this.shouldUseCache()) return;

    const id = record[this.config.primaryKey].toString();
    const recordWithoutRelations = { ...record };

    if (this.config.relations) {
      for (const relationName of Object.keys(this.config.relations)) {
        if (recordWithoutRelations[relationName]) {
          delete recordWithoutRelations[relationName];
        }
      }
    }

    this.modelCache.cacheRecord(
      this.config.tableName,
      id,
      recordWithoutRelations,
      this.columns,
      this.config.cache?.ttl || 60
    );

    if (this.config.relations) {
      for (const [relationName, relationConfig] of Object.entries(
        this.config.relations
      )) {
        let relationIds: number[] | number | null = null;

        if (relationConfig.type === "belongsTo") {
          const foreignKey = relationConfig.prismaField;
          relationIds = record[foreignKey] || null;
        } else if (relationConfig.type === "hasMany" && record[relationName]) {
          const relatedRecords = record[relationName] as Array<Record<string, any>>;
          relationIds = relatedRecords.map((r) => r[relationConfig.targetPK]);
        } else if (relationConfig.type === "hasOne" && record[relationName]) {
          const relatedRecord = record[relationName] as Record<string, any>;
          relationIds = relatedRecord[relationConfig.targetPK] || null;
        }

        if (relationIds !== null) {
          this.modelCache.cacheRelationIds(
            this.config.tableName,
            id,
            relationName,
            relationIds,
            this.config.cache?.ttl || 60
          );
        }
      }
    }
  }

  protected async attachCachedRelations(record: Record<string, any>): Promise<T> {
    if (!this.shouldUseCache() || !this.config.relations) return record as T;

    const result = { ...record };
    const id = record[this.config.primaryKey].toString();

    for (const [relationName, relationConfig] of Object.entries(
      this.config.relations
    )) {
      const relationIds = this.modelCache.getCachedRelationIds(
        this.config.tableName,
        id,
        relationName
      );

      if (relationIds) {
        if (Array.isArray(relationIds)) {
          const relations = await Promise.all(
            relationIds.map((rid) =>
              this.modelCache.getCachedRecord(
                relationConfig.model,
                rid.toString()
              )
            )
          );
          result[relationName] = relations.filter(Boolean);
        } else {
          const relation = await this.modelCache.getCachedRecord(
            relationConfig.model,
            relationIds.toString()
          );
          if (relation) {
            result[relationName] = relation;
          }
        }
      }
    }

    return result as T;
  }

  protected notifySubscribers(id: string): void {
    // Not needed in cache manager
    throw new Error("Not implemented");
  }
}
