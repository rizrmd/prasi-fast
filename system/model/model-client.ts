import { pack } from "msgpackr";

export const prismaFrontendProxy = () => {
  const pending = {} as Record<
    string,
    {
      ops: any[];
      cached: Record<string, { ts: number; value: any }>;
      timeout: any;
      promises: {
        resolve: (value: any) => void;
        reject: (value: any) => void;
      }[];
    }
  >;

  // Transaction state tracking
  const transactionState = {
    active: false,
    operations: [] as Array<{
      modelName: string;
      method: string;
      args: any[];
    }>,
    promises: [] as Array<{
      resolve: (value: any) => void;
      reject: (error: any) => void;
    }>
  };

  // Create a transaction manager
  const executeTransaction = async (operations: Function) => {
    // Start transaction mode
    transactionState.active = true;
    transactionState.operations = [];
    transactionState.promises = [];
    
    try {
      // Execute the callback to collect operations
      const result = await operations();
      
      // If we have operations, send them to the transaction endpoint
      if (transactionState.operations.length > 0) {
        const url = new URL(config.backend.url);
        url.pathname = "/_system/transaction";
        
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-msgpack",
          },
          body: pack(transactionState.operations),
        });
        
        const results = await response.json();
        
        // Resolve all promises with their respective results
        for (let i = 0; i < transactionState.promises.length; i++) {
          const { resolve, reject } = transactionState.promises[i];
          if (i < results.length) {
            const result = results[i];
            if (result && result.error) {
              reject(new Error(result.error.message));
            } else {
              resolve(result);
            }
          } else {
            resolve(null);
          }
        }
      }
      
      return result;
    } catch (error) {
      // Reject all promises if transaction fails
      for (const { reject } of transactionState.promises) {
        reject(error);
      }
      throw error;
    } finally {
      // Reset transaction state
      transactionState.active = false;
      transactionState.operations = [];
      transactionState.promises = [];
    }
  };

  // Create the base proxy object
  const proxy = new Proxy(
    {},
    {
      get: (target, prop: string) => {
        // Handle $transaction method specially
        if (prop === '$transaction') {
          return executeTransaction;
        }
        
        // Otherwise continue with normal proxy behavior for models
        return new Proxy(
          {},
          {
            get: (target, modelName: string) => {
              return new Proxy(
                {},
                {
                  get(target, method: string) {
                    return async (...args: any[]) => {
                      // If we're in a transaction, add to transaction operations
                      if (transactionState.active) {
                        return new Promise<any>((resolve, reject) => {
                          // Add the operation to the transaction
                          transactionState.operations.push({
                            modelName,
                            method,
                            args,
                          });
                          
                          // Store the promise to resolve later
                          transactionState.promises.push({ resolve, reject });
                        });
                      }
                      
                      // Regular non-transaction operation (existing code)
                      if (!pending[modelName]) {
                        pending[modelName] = {
                          ops: [],
                          timeout: null,
                          promises: [],
                          cached: {},
                        };
                      }

                      const cacheKey = JSON.stringify({ method, args });
                      const cached = pending[modelName].cached[cacheKey];
                      if (cached) {
                        const { value, ts } = cached;
                        if (Date.now() - ts < 1000) {
                          return value;
                        }
                      }
                      pending[modelName].ops.push({ method, args });

                      clearTimeout(pending[modelName].timeout);
                      pending[modelName].timeout = setTimeout(async () => {
                        // Create local copies of the arrays we need to process
                        const ops = [...pending[modelName].ops];
                        const promises = [...pending[modelName].promises];
                        
                        // Clear the arrays early to allow new operations to be added
                        pending[modelName].ops = [];
                        pending[modelName].promises = [];
                        
                        // Only proceed if we have operations to execute
                        if (ops.length > 0) {
                          try {
                            const url = new URL(config.backend.url);
                            url.pathname = `/_system/models/${modelName.toLowerCase()}`;
                            const response = await fetch(url, {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/x-msgpack",
                              },
                              body: pack(ops),
                            });
                            
                            const result = await response.json();
                            
                            // Process results and resolve promises
                            for (let i = 0; i < promises.length; i++) {
                              const promise = promises[i];
                              const op = ops[i];
                              
                              if (result instanceof Array && result.length > 0) {
                                const value = result.shift();
                                
                                // Cache the result
                                pending[modelName].cached[JSON.stringify(op)] = { 
                                  ts: Date.now(), 
                                  value 
                                };

                                if (value && value.error) {
                                  promise.reject(value);
                                } else {
                                  promise.resolve(value);
                                }
                              } else {
                                // If we don't have a result, resolve with null to avoid hanging promises
                                promise.resolve(null);
                              }
                            }
                          } catch (error) {
                            // If an error occurs, reject all promises
                            for (const promise of promises) {
                              promise.reject(error);
                            }
                          }
                        } else {
                          // No operations to execute, but we still need to resolve promises
                          for (const promise of promises) {
                            promise.resolve(null);
                          }
                        }
                      }, 300);

                      return new Promise<any>((resolve, reject) => {
                        pending[modelName].promises.push({ resolve, reject });
                      });
                    };
                  },
                }
              );
            },
          }
        );
      },
    }
  );

  return proxy;
};