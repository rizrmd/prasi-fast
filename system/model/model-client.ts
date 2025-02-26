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
                  const url = new URL(config.backend.url);
                  url.pathname = `/_system/models/${modelName}`;
                  const response = await fetch(url, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/x-msgpack",
                    },
                    body: pack(pending[modelName].ops),
                  });
                  const result = await response.json();
                  let i = 0;
                  for (const promise of pending[modelName].promises) {
                    if (result instanceof Array) {
                      const value = result.shift();

                      pending[modelName].cached[
                        JSON.stringify(pending[modelName].ops[i])
                      ] = { ts: Date.now(), value };
                      
                      if (value && value.error) {
                        promise.reject(value);
                      } else {
                        promise.resolve(value);
                      }
                    }
                    i++;
                  }

                  pending[modelName].ops = [];
                  pending[modelName].promises = [];
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
