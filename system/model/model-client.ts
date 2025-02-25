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
      get: (target, tableName: string) => {
        return new Proxy(
          {},
          {
            get(target, method, receiver) {
              return async (...args: any[]) => {
                if (!pending[tableName]) {
                  pending[tableName] = {
                    ops: [],
                    timeout: null,
                    promises: [],
                    cached: {},
                  };
                }

                const cacheKey = JSON.stringify({ method, args });
                const cached = pending[tableName].cached[cacheKey];
                if (cached) {
                  const { value, ts } = cached;
                  if (Date.now() - ts < 1000) {
                    return value;
                  }
                }
                pending[tableName].ops.push({ method, args });

                clearTimeout(pending[tableName].timeout);
                pending[tableName].timeout = setTimeout(async () => {
                  const url = new URL(config.backend.url);
                  url.pathname = `/_system/models/${tableName}`;
                  const response = await fetch(url, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/x-msgpack",
                    },
                    body: pack(pending[tableName].ops),
                  });
                  const result = await response.json();
                  let i = 0;
                  for (const promise of pending[tableName].promises) {
                    if (result instanceof Array) {
                      const value = result.shift();

                      pending[tableName].cached[
                        JSON.stringify(pending[tableName].ops[i])
                      ] = { ts: Date.now(), value };
                      
                      if (value && value.error) {
                        promise.reject(value);
                      } else {
                        promise.resolve(value);
                      }
                    }
                    i++;
                  }

                  pending[tableName].ops = [];
                  pending[tableName].promises = [];
                }, 300);

                return new Promise<any>((resolve, reject) => {
                  pending[tableName].promises.push({ resolve, reject });
                });
              };
            },
          }
        );
      },
    }
  );
};
