import type { PrismaClient, User } from "@prisma/client";
import type { ModelConfig, PaginationParams, PaginationResult } from "../types";
import { ModelCrud } from "./base/manager/model-crud";
import { ModelCacheManager } from "./base/manager/model-cache";
import { ModelQuery } from "./base/manager/model-query";
import { ModelRelations } from "./base/manager/model-relations";
import { prismaFrontendProxy } from "./model-client";
import type { BaseRecord } from "./base/model-base";
import { ModelCache } from "./base/model-cache";

export {
  defaultColumns,
  type DefaultColumns,
  type BaseRecord,
} from "./base/model-base";

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
  updateCallbacks: Set<(data: T) => void>;
}

export class Model<T extends BaseRecord = any> {
  protected state: ModelState<T> = {
    prisma: undefined as unknown as PrismaClient,
    config: undefined as unknown as ModelConfig,
    data: null,
    mode: "server",
    currentUser: null,
    modelCache: new ModelCache(false),
    updateCallbacks: new Set(),
  };
  private cacheManager!: ModelCacheManager<T>;
  private queryManager!: ModelQuery<T>;
  private relationsManager!: ModelRelations<T>;
  private crudManager!: ModelCrud<T>;

  private initialized = false;
  private initPromise: Promise<void>;

  constructor(config: ModelConfig) {
    this.state.config = config;
    this.initPromise = this.initialize();
  }

  get prisma() {
    return this.state.prisma;
  }

  get config() {
    return this.state.config;
  }

  private async initialize() {
    if (this.initialized) return;

    // Initialize basic config for frontend cache first
    if (typeof window !== "undefined") {
      this.state.config = {
        ...this.state.config,
        cache: { ttl: 60 },
      };
    }

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

    // Share state with data managers first
    const dataManagers = [
      this.cacheManager,
      this.queryManager,
      this.relationsManager,
    ];

    dataManagers.forEach((manager) => {
      Object.defineProperty(manager, "state", {
        get: () => {
          return this.state;
        },
      });
    });

    this.cacheManager._friend.initializeCache(this.state.modelCache);

    // Create concrete implementation of ModelCrud
    class ConcreteCrud extends ModelCrud<T> {
      constructor(private model: Model<T>) {
        super();
        Object.defineProperty(this, "state", {
          get: () => model.state,
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
        await this.model.cacheManager._friend.cacheRecordAndRelations(
          record,
          select
        );
      }

      protected async attachCachedRelations(record: Record<string, any>) {
        return this.model.cacheManager._friend.attachCachedRelations(record);
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
    ];

    managers.forEach((manager) => {
      Object.defineProperty(manager, "state", {
        get: () => this.state,
      });
    });
  }

  private async initializePrisma(): Promise<void> {
    if (typeof window !== "undefined") {
      this.state.mode = "client";
      this.state.prisma = prismaFrontendProxy() as PrismaClient;
    } else {
      this.state.mode = "server";
      // Explicitly disable cache on server side
      if (this.state.config) {
        this.state.config = {
          ...this.state.config,
          cache: undefined,
        };
      }

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

  public async findBefore(params: {
    id: string;
    perPage?: number;
    select?: Record<string, any>;
    where?: Record<string, any>;
  }): Promise<T[]> {
    await this.ensureInitialized();
    return this.crudManager.findBefore(params);
  }

  public async findAfter(params: {
    id: string;
    perPage?: number;
    select?: Record<string, any>;
    where?: Record<string, any>;
  }): Promise<T[]> {
    await this.ensureInitialized();
    return this.crudManager.findAfter(params);
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
    const result = await this.crudManager.update(params);
    this.state.updateCallbacks.forEach((callback) => callback(result));
    return result;
  }

  public onUpdate(callback: (data: T) => void): () => void {
    this.state.updateCallbacks.add(callback);
    return () => {
      this.state.updateCallbacks.delete(callback);
    };
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
