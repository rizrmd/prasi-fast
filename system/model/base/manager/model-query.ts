import { ModelManager } from "../model-manager";
import type { BaseRecord } from "../model-base";
import type { QueryManagerFriend, WithFriends } from "../model-friend";
import type { ModelState } from "../../model";

export class ModelQuery<T extends BaseRecord = any>
  extends ModelManager<T>
  implements WithFriends<QueryManagerFriend>
{
  protected state!: ModelState<T>;

  public readonly _friend: QueryManagerFriend = {
    ensurePrimaryKeys: this.ensurePrimaryKeys.bind(this),
    getSelectFields: this.getSelectFields.bind(this),
  };

  protected ensurePrimaryKeys(
    select: Record<string, any>
  ): Record<string, any> {
    const enhancedSelect = { ...select };

    // Ensure model's primary key is selected
    enhancedSelect[this.state.config.primaryKey] = true;

    // Ensure relation primary keys are selected
    if (this.state.config.relations) {
      for (const [relationName, relationConfig] of Object.entries(
        this.state.config.relations
      )) {
        // If relation is selected
        if (select[relationName]) {
          if (typeof select[relationName] === "object") {
            // Ensure relation's primary key is selected
            enhancedSelect[relationName] = {
              ...select[relationName],
              select: {
                ...select[relationName].select,
                [relationConfig.toColumn]: true,
              },
            };
          } else {
            // If relation is just true, create proper select with primary key
            enhancedSelect[relationName] = {
              select: {
                [relationConfig.toColumn]: true,
              },
            };
          }
        }
      }
    }

    return enhancedSelect;
  }

  protected getSelectFields(select?: Record<string, any>): string[] {
    if (!select) return Object.keys(this.state.config.columns);

    const fields: string[] = [];
    for (const [key, value] of Object.entries(select)) {
      if (typeof value === "boolean" && value) {
        fields.push(key);
      } else if (
        typeof value === "object" &&
        this.state.config.relations?.[key]
      ) {
        // For relations, we need their foreign keys
        const relationConfig = this.state.config.relations[key];
        if (relationConfig.type === "belongsTo") {
          fields.push(relationConfig.prismaField);
        }
      }
    }
    // Always include primary key
    if (!fields.includes(this.state.config.primaryKey)) {
      fields.push(this.state.config.primaryKey);
    }
    return fields;
  }

  protected getDefaultConditions() {
    return {};
  }

  protected buildSearchQuery(search: string) {
    return {};
  }
}
