// Friend interfaces to allow selective access to protected methods
export interface QueryManagerFriend {
  ensurePrimaryKeys: (select: Record<string, any>) => Record<string, any>;
  getSelectFields: (select?: Record<string, any>) => string[];
}

export interface CacheManagerFriend {
  invalidateCache: () => void;
  cacheRecordAndRelations: (record: Record<string, any>, select?: Record<string, any>) => Promise<void>;
  attachCachedRelations: (record: Record<string, any>) => Promise<any>;
}

export interface SubscriptionManagerFriend {
  notifySubscribers: (id: string) => void;
}

// Expose protected methods through friend interfaces
export interface WithFriends<T> {
  _friend: T;
}
