import { ModelName } from "shared/types";

export type ColumnType =
  | "string"
  | "number"
  | "boolean"
  | "date"
  | "enum"
  | "relation"
  | "json";

export interface ColumnConfig {
  type: ColumnType;
  label?: string;
  required?: boolean;
  searchable?: boolean;
  filterable?: boolean;
  sortable?: boolean;
  hidden?: boolean;
  format?: (value: any) => any;
  validate?: (value: any) => boolean | string;
  enum?: string[];
  relation?: {
    model: string;
    field: string;
    multiple?: boolean;
  };
}
export interface RelationConfig {
  model: ModelName;
  type: "hasMany" | "belongsTo" | "hasOne";
  prismaField: string;
  targetPK: string;
  label?: string;
}
export type ModelRelations = Record<string, RelationConfig>;
export type ModelColumns = Record<string, ColumnConfig>;
export type ModelConfig = {
  modelName: string;
  tableName: string;
  primaryKey: string;
  relations: ModelRelations;
  columns: ModelColumns;
  cache?: {
    ttl: number;
  };
};

export interface PaginationParams {
  page?: number;
  perPage?: number;
  orderBy?: string;
  orderDirection?: "asc" | "desc";
  search?: string;
  where?: Record<string, any>;
  select?: Record<string, any>;
  useCache?: boolean;
}

export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface BaseRecord {
  id: number;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
  created_by?: number;
  updated_by?: number;
}

export interface ServerError {
  code: string;
  message: string;
  details?: any;
}

export interface ServerResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ServerError;
}

export interface MethodResult<T = any> {
  data: T;
}
