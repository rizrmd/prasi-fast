import type { PrismaClient, User } from "@prisma/client";
import type { ModelConfig, PaginationParams, PaginationResult } from "../types";
import { ModelCrud } from "./base/manager/model-crud";
import { CacheManager } from "./base/manager/model-cache";
import { ModelQuery } from "./base/manager/model-query";
import { ModelRelations } from "./base/manager/model-relations";
import { prismaFrontendProxy } from "./model-client";
import type { BaseRecord } from "./base/model-base";

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
  updateCallbacks: Set<(data: T) => void>;
}

export class Model<T extends BaseRecord = any> {
  protected state: ModelState<T> = {
    prisma: null as unknown as PrismaClient,
    config: {
      modelName: "",
      tableName: "",
      columns: {},
      primaryKey: "id",
      relations: {},
    },
    data: null,
    mode: "server",
    currentUser: null,
    updateCallbacks: new Set(),
  };
  private cacheManager!: CacheManager;
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

  titleColumns = [] as string[];

  private async initialize() {
    if (this.initialized) return;
    await this.initializePrisma();
    await this.setupManagers();
    this.initialized = true;
  }

  private async ensureInitialized() {
    if (!this.initialized) await this.initPromise;
  }

  private async setupManagers() {
    this.cacheManager = new CacheManager(this.state.config.modelName);
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
    }

    this.crudManager = new ConcreteCrud(this);

    // No need to redefine state for managers that already have it
    // Only define state for crudManager if it's not already defined
    if (!Object.getOwnPropertyDescriptor(this.crudManager, 'state')) {
      Object.defineProperty(this.crudManager, "state", {
        get: () => this.state,
      });
    }
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

  /**
   * Delete multiple records that match the given criteria
   * This performs a soft delete by setting deleted_at timestamp
   */
  public async deleteMany(params: { where: { [key: string]: any } }): Promise<{ count: number }> {
    await this.ensureInitialized();
    return this.crudManager.deleteMany(params);
  }

  /**
   * Update multiple records that match the given criteria
   */
  public async updateMany(params: { 
    where: { [key: string]: any };
    data: Partial<T>;
  }): Promise<{ count: number }> {
    await this.ensureInitialized();
    return this.crudManager.updateMany(params);
  }

  // Relation methods
  public async getRelation<RelatedModel>(
    relationName: string
  ): Promise<RelatedModel[] | RelatedModel | null> {
    await this.ensureInitialized();
    return this.relationsManager.getRelation(relationName);
  }
}
