import { ModelBase } from "./base";
import type { BaseRecord } from "./model-base";

export abstract class ModelManager<T extends BaseRecord = any> extends ModelBase<T> {
  // Make protected methods accessible to concrete implementations
  public _ensurePrimaryKeys(select: Record<string, any>): Record<string, any> {
    return this.ensurePrimaryKeys(select);
  }

  public _getSelectFields(select?: Record<string, any>): string[] {
    return this.getSelectFields(select);
  }

  public _invalidateCache(): void {
    this.invalidateCache();
  }

  public async _cacheRecordAndRelations(
    record: Record<string, any>,
    select?: Record<string, any>
  ): Promise<void> {
    await this.cacheRecordAndRelations(record, select);
  }

  public async _attachCachedRelations(record: Record<string, any>): Promise<T> {
    return this.attachCachedRelations(record);
  }


  // Abstract methods to be implemented
  protected abstract ensurePrimaryKeys(select: Record<string, any>): Record<string, any>;
  protected abstract getSelectFields(select?: Record<string, any>): string[];
  protected abstract invalidateCache(): void;
  protected abstract cacheRecordAndRelations(
    record: Record<string, any>,
    select?: Record<string, any>
  ): Promise<void>;
  protected abstract attachCachedRelations(record: Record<string, any>): Promise<T>;
}
