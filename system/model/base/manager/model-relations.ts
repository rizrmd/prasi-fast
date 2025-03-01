import { ModelManager } from "../model-manager";
import type { BaseRecord } from "../model-base";
import type { WithFriends } from "../model-friend";
import type { ModelState } from "../../model";

export class ModelRelations<T extends BaseRecord = any> extends ModelManager<T> {
  protected state!: ModelState<T>;

  public async getRelation<RelatedModel>(
    relationName: string
  ): Promise<RelatedModel[] | RelatedModel | null> {
    if (!this.state.data || !this.state.config.relations?.[relationName]) {
      return null;
    }

    const relationConfig = this.state.config.relations[relationName];
    const relatedId = this.state.data[relationConfig.prismaField];

    if (!relatedId) {
      return null;
    }

    const prismaModelName = relationConfig.model.charAt(0).toLowerCase() + 
                          relationConfig.model.slice(1);
    const prismaTable = (this.state.prisma as any)[prismaModelName];

    if (relationConfig.type === "hasMany") {
      const records = await prismaTable.findMany({
        where: {
          [relationConfig.toColumn]: this.state.data.id,
        },
      });
      return records as RelatedModel[];
    } else {
      // For hasOne and belongsTo
      const record = await prismaTable.findUnique({
        where: {
          id: relatedId,
        },
      });
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
}
