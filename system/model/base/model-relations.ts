import { ModelManager } from "./model-manager";
import type { BaseRecord } from "./model-base";
import type { WithFriends } from "./model-friend";

export class ModelRelations<T extends BaseRecord = any> extends ModelManager<T> {
  // No friend interface needed for relations manager since it only has public methods
  public async getRelation<RelatedModel>(
    relationName: string
  ): Promise<RelatedModel[] | RelatedModel | null> {
    if (
      !this.data ||
      !this.config.relations?.[relationName] ||
      !this.config.cache
    ) {
      return null;
    }

    const relationConfig = this.config.relations[relationName];
    const relatedIds = this.modelCache.getCachedRelationIds(
      this.config.tableName,
      this.data.id.toString(),
      relationName
    );

    if (!relatedIds) {
      return null;
    }

    if (relationConfig.type === "hasMany") {
      if (!Array.isArray(relatedIds)) return [];

      const relatedRecords = await Promise.all(
        relatedIds.map(async (id) => {
          const record = await this.modelCache.getCachedRecord(
            relationConfig.model,
            id.toString()
          );
          return record as RelatedModel;
        })
      );

      return relatedRecords.filter(Boolean);
    } else {
      // For hasOne and belongsTo
      if (typeof relatedIds !== "number") return null;

      const record = this.modelCache.getCachedRecord(
        relationConfig.model,
        relatedIds.toString()
      );
      return record as RelatedModel;
    }
  }

  // Implement abstract methods from ModelManager
  protected ensurePrimaryKeys(select: Record<string, any>): Record<string, any> {
    // Not needed in relations manager
    throw new Error("Not implemented");
  }

  protected getSelectFields(select?: Record<string, any>): string[] {
    // Not needed in relations manager
    throw new Error("Not implemented");
  }

  protected invalidateCache(): void {
    // Not needed in relations manager
    throw new Error("Not implemented");
  }

  protected async cacheRecordAndRelations(
    record: Record<string, any>,
    select?: Record<string, any>
  ): Promise<void> {
    // Not needed in relations manager
    throw new Error("Not implemented");
  }

  protected async attachCachedRelations(record: Record<string, any>): Promise<T> {
    // Not needed in relations manager
    throw new Error("Not implemented");
  }

  protected notifySubscribers(id: string): void {
    // Not needed in relations manager
    throw new Error("Not implemented");
  }
}
