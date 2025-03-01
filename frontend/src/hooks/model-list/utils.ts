import * as Models from "shared/models";

export const getModelInfo = (relationName: string) => {
  const modelName = Object.keys(Models).find(
    (key) => key.toLowerCase() === relationName.toLowerCase()
  );
  return modelName ? (Models as any)[modelName] : null;
};

export const getAccessorPath = (
  column: any,
  modelInstance: any
): {
  path: string;
  models: {
    model: (typeof Models)[keyof typeof Models];
    type: "hasMany" | "belongsTo" | "hasOne" | undefined;
  }[];
} => {
  if (!("rel" in column)) return { path: column.col, models: [] };

  if (typeof column.rel === "string") {
    const relModel = getModelInfo(column.rel);
    return {
      path: `${column.rel}.${column.col}`,
      models: relModel
        ? [
            {
              model: relModel,
              type: modelInstance?.config.relations[column.rel].type,
            },
          ]
        : [],
    };
  }

  const paths: string[] = [];
  const models: any[] = [];

  const processRelObject = (obj: any, parentModel: any = null): void => {
    if ("col" in obj) {
      paths.push(obj.col);
      return;
    }

    const key = Object.keys(obj)[0];
    const value = obj[key];

    if (paths.length === 0) {
      paths.push(key);
      const currentModel = getModelInfo(key);
      if (currentModel) {
        models.push(currentModel);
        if (typeof value === "object") {
          processRelObject(value, currentModel);
        }
      }
    } else {
      if (parentModel) {
        paths.push(key);
        const relationConfig = parentModel.config.relations[key];
        if (relationConfig) {
          const nextModel = getModelInfo(relationConfig.model);
          if (nextModel) {
            models.push(nextModel);
            if (typeof value === "object") {
              processRelObject(value, nextModel);
            }
          }
        }
      }
    }
  };

  processRelObject(column.rel);
  return { path: paths.join("."), models };
};

export const buildSelect = (column: any): any => {
  if (!("rel" in column)) {
    return true;
  }

  if (typeof column.rel === "string") {
    return {
      [column.rel]: {
        select: {
          [column.col]: true,
        },
      },
    };
  }

  const processRelObject = (obj: any): any => {
    if ("col" in obj) {
      return { [obj.col]: true };
    }

    const key = Object.keys(obj)[0];
    const value = obj[key];

    if ("col" in value) {
      return {
        [key]: {
          select: {
            [value.col]: true,
          },
        },
      };
    }

    const nestedValue = processRelObject(value);

    return {
      [key]: {
        select: nestedValue,
      },
    };
  };

  return processRelObject(column.rel);
};

export const buildNestedWhereClause = (
  path: string[],
  values: any[]
): WhereClause => {
  if (path.length === 1) {
    return {
      [path[0]]: {
        in: values,
      },
    };
  }

  const [first, ...rest] = path;
  return {
    [first]: buildNestedWhereClause(rest, values),
  };
};

export const buildWhereClause = (
  filterBy: Record<string, any[]>
): { OR: WhereClause[] } | undefined => {
  const filters = Object.entries(filterBy).map(([key, values]) => {
    if (key.includes(".")) {
      const path = key.split(".");
      return buildNestedWhereClause(path, values);
    } else {
      return {
        [key]: {
          in: values,
        },
      };
    }
  });

  return filters.length > 0 ? { OR: filters } : undefined;
};

type WhereClause = {
  [key: string]: {
    in?: any[];
    [key: string]: any;
  };
};
