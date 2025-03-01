import { ReactNode } from "react";
import { ModelName, Models } from "shared/types";

type GetModelFromRel<
  Name extends ModelName,
  Rel extends Models[Name]["relations"][number]
> = Models[Name]["config"]["relations"][Rel]["model"];

type GetColumnsFromModel<M extends ModelName> = Models[M]["columns"][number];

type RelValue<M extends ModelName> =
  | { col: GetColumnsFromModel<M> }
  | { [K in Models[M]["relations"][number]]?: RelValue<GetModelFromRel<M, K>> };

export type RelObject<M extends ModelName> = {
  [K in Models[M]["relations"][number]]?: RelValue<GetModelFromRel<M, K>>;
};

export type Column<Name extends ModelName> =
  | { col: GetColumnsFromModel<Name> }
  | {
      rel: Models[Name]["relations"][number];
      col: GetColumnsFromModel<
        GetModelFromRel<Name, Models[Name]["relations"][number]>
      >;
    }
  | { rel: RelObject<Name>;  };

export type LayoutList<Name extends ModelName> = {
  columns: Column<Name>[];
  checkbox?: {
    enabled: boolean;
    actions?: { label: ReactNode; onClick: () => void }[];
  };
};

export type Fields<Name extends ModelName> =
  | { vertical: Fields<Name>[] }
  | { horizontal: Fields<Name>[] }
  | Column<Name>;

export type LayoutDetail<Name extends ModelName> = {
  fields: Fields<Name>;
  tabs: DetailTab<Name>[];
};

export type DetailTab<Name extends ModelName> = {
  title: string;
} & (
  | { type: "default" }
  | { type: "relation"; name: Models[Name]["relations"][number] }
  | { type: "jsx"; element: ReactNode }
);
