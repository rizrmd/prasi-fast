export class ModelRegistry {
  private static instances: Map<string, any> = new Map();

  public static getInstance<M>(modelName: string, modelConstructor: new () => M): M {
    if (!ModelRegistry.instances.has(modelName)) {
      ModelRegistry.instances.set(modelName, new modelConstructor());
    }
    return ModelRegistry.instances.get(modelName) as M;
  }

  public static getInstances(): any[] {
    return Array.from(ModelRegistry.instances.values());
  }
}
