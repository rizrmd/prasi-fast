import { TabState } from "../types";

export const listFilterToWhere = (filter: TabState["list"]["filter"]) => {
  const where: Record<string, any> = {};
  const orConditions: Record<string, any>[] = [];

  // Process regular filter values if they exist
  if (filter.values) {
    for (const [column, value] of Object.entries(filter.values)) {
      if (value === undefined || value === null || value === '') continue;

      // Get operator configuration for this column
      const fieldConfig = filter.field.config[column];
      if (!fieldConfig) continue;

      const operator = fieldConfig.operator;

      // Handle different operator types
      switch (operator) {
        case 'equals':
          where[column] = value;
          break;
        case 'contains':
          where[column] = { contains: value };
          break;
        case 'startsWith':
          where[column] = { startsWith: value };
          break;
        case 'endsWith':
          where[column] = { endsWith: value };
          break;
        case 'gt':
          where[column] = { gt: value };
          break;
        case 'gte':
          where[column] = { gte: value };
          break;
        case 'lt':
          where[column] = { lt: value };
          break;
        case 'lte':
          where[column] = { lte: value };
          break;
        case 'in':
          where[column] = { in: Array.isArray(value) ? value : [value] };
          break;
        case 'notIn':
          where[column] = { notIn: Array.isArray(value) ? value : [value] };
          break;
        case 'not':
          where[column] = { not: value };
          break;
        default:
          where[column] = value; // Default to equals
      }
    }
  }

  // Process unique filter values if they exist
  if (filter.unique) {
    for (const [column, uniqueFilter] of Object.entries(filter.unique)) {
      if (uniqueFilter.value === undefined || uniqueFilter.value === null || uniqueFilter.value === '') continue;

      // Get operator configuration for this column
      const fieldConfig = filter.field.config[column];
      if (!fieldConfig) continue;

      const operator = fieldConfig.operator;
      const uniqueCondition: Record<string, any> = {};

      // Handle different operator types for unique filters
      switch (operator) {
        case 'equals':
          uniqueCondition[column] = uniqueFilter.value;
          break;
        case 'contains':
          uniqueCondition[column] = { contains: uniqueFilter.value };
          break;
        case 'startsWith':
          uniqueCondition[column] = { startsWith: uniqueFilter.value };
          break;
        case 'endsWith':
          uniqueCondition[column] = { endsWith: uniqueFilter.value };
          break;
        case 'gt':
          uniqueCondition[column] = { gt: uniqueFilter.value };
          break;
        case 'gte':
          uniqueCondition[column] = { gte: uniqueFilter.value };
          break;
        case 'lt':
          uniqueCondition[column] = { lt: uniqueFilter.value };
          break;
        case 'lte':
          uniqueCondition[column] = { lte: uniqueFilter.value };
          break;
        case 'in':
          uniqueCondition[column] = { in: Array.isArray(uniqueFilter.value) ? uniqueFilter.value : [uniqueFilter.value] };
          break;
        case 'notIn':
          uniqueCondition[column] = { notIn: Array.isArray(uniqueFilter.value) ? uniqueFilter.value : [uniqueFilter.value] };
          break;
        case 'not':
          uniqueCondition[column] = { not: uniqueFilter.value };
          break;
        default:
          uniqueCondition[column] = uniqueFilter.value; // Default to equals
      }
      orConditions.push(uniqueCondition);
    }
  }

  // If we have any OR conditions, add them to the where clause
  if (orConditions.length > 0) {
    where.OR = orConditions;
  }

  return where;
};
