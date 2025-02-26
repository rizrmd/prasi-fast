import { ModelManager } from "../model-manager";
import type { BaseRecord } from "../model-base";
import { QueryManagerFriend, WithFriends } from "../model-friend";

export class ModelQuery<T extends BaseRecord = any> extends ModelManager<T> implements WithFriends<QueryManagerFriend> {
  public readonly _friend: QueryManagerFriend = {
    ensurePrimaryKeys: this.ensurePrimaryKeys.bind(this),
    getSelectFields: this.getSelectFields.bind(this)
  };
  protected ensurePrimaryKeys(select: Record<string, any>): Record<string, any> {
    const enhancedSelect = { ...select };

    // Ensure model's primary key is selected
    enhancedSelect[this.config.primaryKey] = true;

    // Ensure relation primary keys are selected
    if (this.config.relations) {
      for (const [relationName, relationConfig] of Object.entries(
        this.config.relations
      )) {
        // If relation is selected
        if (select[relationName]) {
          if (typeof select[relationName] === "object") {
            // Ensure relation's primary key is selected
            enhancedSelect[relationName] = {
              ...select[relationName],
              select: {
                ...select[relationName].select,
                [relationConfig.targetPK]: true,
              },
            };
          } else {
            // If relation is just true, create proper select with primary key
            enhancedSelect[relationName] = {
              select: {
                [relationConfig.targetPK]: true,
              },
            };
          }
        }
      }
    }

    return enhancedSelect;
  }

  protected getSelectFields(select?: Record<string, any>): string[] {
    if (!select) return [...this.columns];

    const fields: string[] = [];
    for (const [key, value] of Object.entries(select)) {
      if (typeof value === "boolean" && value) {
        fields.push(key);
      } else if (typeof value === "object" && this.config.relations?.[key]) {
        // For relations, we need their foreign keys
        const relationConfig = this.config.relations[key];
        if (relationConfig.type === "belongsTo") {
          fields.push(relationConfig.prismaField);
        }
      }
    }
    // Always include primary key
    if (!fields.includes(this.config.primaryKey)) {
      fields.push(this.config.primaryKey);
    }
    return fields;
  }

  protected getDefaultConditions() {
    return {};
  }

  protected buildSearchQuery(search: string) {
    return {};
  }

  // Implement abstract methods from ModelManager
  protected invalidateCache(): void {
    // Not needed in query manager
    throw new Error("Not implemented");
  }

  protected async cacheRecordAndRelations(
    record: Record<string, any>,
    select?: Record<string, any>
  ): Promise<void> {
    // Not needed in query manager
    throw new Error("Not implemented");
  }

  protected async attachCachedRelations(record: Record<string, any>): Promise<T> {
    // Not needed in query manager
    throw new Error("Not implemented");
  }

  protected notifySubscribers(id: string): void {
    // Not needed in query manager
    throw new Error("Not implemented");
  }
}
