import type { BaseRecord } from "./model-base";

export abstract class ModelManager<T extends BaseRecord = any> {
  // Make protected methods accessible to concrete implementations
  public _ensurePrimaryKeys(select: Record<string, any>): Record<string, any> {
    return this.ensurePrimaryKeys(select);
  }

  public _getSelectFields(select?: Record<string, any>): string[] {
    return this.getSelectFields(select);
  }

  // Abstract methods to be implemented
  protected abstract ensurePrimaryKeys(
    select: Record<string, any>
  ): Record<string, any>;
  protected abstract getSelectFields(select?: Record<string, any>): string[];
}
