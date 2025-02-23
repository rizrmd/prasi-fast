export const prismaFrontendProxy = (tableName: string) => {
  return new Proxy(
    {},
    {
      get: (target, propKey) => {
        return async (...args: any[]) => {
          const response = await fetch(`/api/${tableName}}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ method: propKey, args }),
          });
          return await response.json();
        };
      },
    }
  );
};
