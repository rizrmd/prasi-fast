import type { PrismaClient, User } from "@prisma/client";
import type { ModelConfig, PaginationParams, PaginationResult } from "../types";
import { ModelCrud } from "./base/model-crud";
import { ModelCacheManager } from "./base/model-cache";
import { ModelQuery } from "./base/model-query";
import { ModelRelations } from "./base/model-relations";
import { ModelSubscription } from "./base/model-subscription";
import { prismaFrontendProxy } from "./model-client";
import type { BaseRecord } from "./base/model-base";
import { ModelCache } from "./model-cache";

export { defaultColumns, type DefaultColumns, type BaseRecord } from "./base/model-base";

const g = (typeof global !== "undefined" ? global : undefined) as unknown as {
  prisma: PrismaClient;
};

export interface ModelState<T extends BaseRecord> {
  prisma: PrismaClient;
  config: ModelConfig;
  data: T | null;
  mode: "client" | "server";
  currentUser: User | null;
  modelCache: ModelCache;
}

export class Model<T extends BaseRecord = any> {
  private state: ModelState<T> = {
    prisma: undefined as unknown as PrismaClient,
    config: undefined as unknown as ModelConfig,
    data: null,
    mode: "server",
    currentUser: null,
    modelCache: new ModelCache()
  };
  private cacheManager!: ModelCacheManager<T>;
  private queryManager!: ModelQuery<T>;
  private relationsManager!: ModelRelations<T>;
  private subscriptionManager!: ModelSubscription<T>;
  private crudManager!: ModelCrud<T>;

  private initialized = false;
  private initPromise: Promise<void>;

  constructor() {
    this.initPromise = this.initialize();
  }

  private async initialize() {
    if (this.initialized) return;
    await this.initializePrisma();
    await this.setupManagers();
    this.initialized = true;
  }

  private async ensureInitialized() {
    await this.initPromise;
  }

  private async setupManagers() {
    this.cacheManager = new ModelCacheManager<T>();
    this.queryManager = new ModelQuery<T>();
    this.relationsManager = new ModelRelations<T>();
    this.subscriptionManager = new ModelSubscription<T>();

    // Share state with data managers first
    const dataManagers = [
      this.cacheManager, 
      this.queryManager, 
      this.relationsManager, 
      this.subscriptionManager
    ];

    dataManagers.forEach(manager => {
      Object.defineProperty(manager, 'state', {
        get: () => this.state
      });
    });
    
    // Create concrete implementation of ModelCrud
    class ConcreteCrud extends ModelCrud<T> {
      constructor(private model: Model<T>) {
        super();
        Object.defineProperty(this, 'state', {
          get: () => model.state
        });
      }

      protected ensurePrimaryKeys(select: Record<string, any>) {
        return this.model.queryManager._friend.ensurePrimaryKeys(select);
      }

      protected getSelectFields(select?: Record<string, any>) {
        return this.model.queryManager._friend.getSelectFields(select);
      }

      protected invalidateCache() {
        this.model.cacheManager._friend.invalidateCache();
      }

      protected async cacheRecordAndRelations(
        record: Record<string, any>,
        select?: Record<string, any>
      ) {
        await this.model.cacheManager._friend.cacheRecordAndRelations(record, select);
      }

      protected async attachCachedRelations(record: Record<string, any>) {
        return this.model.cacheManager._friend.attachCachedRelations(record);
      }

      protected notifySubscribers(id: string) {
        this.model.subscriptionManager._friend.notifySubscribers(id);
      }
    }

    this.crudManager = new ConcreteCrud(this);

    // Share state with all managers

    // Share state with managers
    const managers = [
      this.crudManager,
      this.cacheManager,
      this.queryManager,
      this.relationsManager,
      this.subscriptionManager
    ];

    managers.forEach(manager => {
      Object.defineProperty(manager, 'state', {
        get: () => this.state
      });
    });
  }

  private async initializePrisma(): Promise<void> {
    if (typeof window !== "undefined") {
      this.state.mode = "client";
      if (!this.state.config?.cache) {
        this.state.config = {
          ...this.state.config,
          cache: { ttl: 60 }
        };
      }
      this.state.prisma = prismaFrontendProxy() as PrismaClient;
    } else {
      this.state.mode = "server";
      delete this.state.config?.cache;

      if (!g.prisma) {
        g.prisma = new (await import("@prisma/client")).PrismaClient();
      }
      this.state.prisma = g.prisma;
    }
  }

  public async setCurrentUser(user: User | null): Promise<void> {
    await this.ensureInitialized();
    this.state.currentUser = user;
  }

  public async getConfig(): Promise<ModelConfig> {
    await this.ensureInitialized();
    return this.state.config;
  }

  public async setConfig(value: ModelConfig): Promise<void> {
    await this.ensureInitialized();
    this.state.config = value;
  }

  // Public API delegating to managers

  // Subscription methods
  public async subscribe(ids: string[]): Promise<() => void> {
    await this.ensureInitialized();
    return this.subscriptionManager.subscribe(ids);
  }
  
  // CRUD methods
  public async findFirst(
    idOrParams: string | Partial<PaginationParams>
  ): Promise<T | null> {
    await this.ensureInitialized();
    return this.crudManager.findFirst(idOrParams);
  }

  public async findList(
    params: Partial<PaginationParams & { select?: Record<string, any> }> = {}
  ): Promise<PaginationResult<T>> {
    await this.ensureInitialized();
    return this.crudManager.findList(params);
  }

  public async findMany(
    params: Partial<
      Omit<PaginationParams, "page" | "perPage"> & {
        select?: Record<string, any>;
      }
    > = {}
  ): Promise<T[]> {
    await this.ensureInitialized();
    return this.crudManager.findMany(params);
  }

  public async create(params: { data: Partial<T> }): Promise<T> {
    await this.ensureInitialized();
    return this.crudManager.create(params);
  }

  public async update(params: {
    where: { [key: string]: any };
    data: Partial<T>;
  }): Promise<T> {
    await this.ensureInitialized();
    return this.crudManager.update(params);
  }

  public async delete(params: { where: { [key: string]: any } }): Promise<T> {
    await this.ensureInitialized();
    return this.crudManager.delete(params);
  }

  // Relation methods
  public async getRelation<RelatedModel>(
    relationName: string
  ): Promise<RelatedModel[] | RelatedModel | null> {
    await this.ensureInitialized();
    return this.relationsManager.getRelation(relationName);
  }
}
