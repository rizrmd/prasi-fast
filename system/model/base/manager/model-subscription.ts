import { ModelManager } from "../model-manager";
import type { BaseRecord } from "../model-base";
import { SubscriptionManagerFriend, WithFriends } from "../model-friend";

export class ModelSubscription<T extends BaseRecord = any> extends ModelManager<T> implements WithFriends<SubscriptionManagerFriend> {
  public readonly _friend: SubscriptionManagerFriend = {
    notifySubscribers: this.notifySubscribers.bind(this)
  };
  protected subscribers: Map<string, Set<() => void>> = new Map();

  public subscribe(ids: string[]): () => void {
    const callback = () => {
      this._invalidateCache();
    };

    ids.forEach(id => {
      if (!this.subscribers.has(id)) {
        this.subscribers.set(id, new Set());
      }
      this.subscribers.get(id)!.add(callback);
    });

    return () => {
      ids.forEach(id => {
        const callbacks = this.subscribers.get(id);
        if (callbacks) {
          callbacks.delete(callback);
          if (callbacks.size === 0) {
            this.subscribers.delete(id);
          }
        }
      });
    };
  }

  protected notifySubscribers(id: string): void {
    const callbacks = this.subscribers.get(id);
    if (callbacks) {
      callbacks.forEach(callback => callback());
    }
  }

  // Implement abstract methods from ModelManager
  protected ensurePrimaryKeys(select: Record<string, any>): Record<string, any> {
    // Not needed in subscription manager
    throw new Error("Not implemented");
  }

  protected getSelectFields(select?: Record<string, any>): string[] {
    // Not needed in subscription manager
    throw new Error("Not implemented");
  }

  protected invalidateCache(): void {
    // Not needed in subscription manager
    throw new Error("Not implemented");
  }

  protected async cacheRecordAndRelations(
    record: Record<string, any>,
    select?: Record<string, any>
  ): Promise<void> {
    // Not needed in subscription manager
    throw new Error("Not implemented");
  }

  protected async attachCachedRelations(record: Record<string, any>): Promise<T> {
    // Not needed in subscription manager
    throw new Error("Not implemented");
  }
}
