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

  return new Proxy(
    {},
    {
      get: (target, modelName: string) => {
        return new Proxy(
          {},
          {
            get(target, method, receiver) {
              return async (...args: any[]) => {
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
                  // This prevents race conditions if new operations come in while processing
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
                    // to avoid hanging the UI
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
};
