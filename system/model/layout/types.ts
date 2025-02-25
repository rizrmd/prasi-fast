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

type RelObject<M extends ModelName> = {
  [K in Models[M]["relations"][number]]?: RelValue<GetModelFromRel<M, K>>;
};

type Column<Name extends ModelName> =
  | { col: GetColumnsFromModel<Name> }
  | {
      rel: Models[Name]["relations"][number];
      col: GetColumnsFromModel<
        GetModelFromRel<Name, Models[Name]["relations"][number]>
      >;
    }
  | { rel: RelObject<Name> };

export type LayoutTable<Name extends ModelName> = {
  columns: Column<Name>[];
  checkbox?: {
    enabled: boolean;
    actions: { label: ReactNode; onClick: () => void }[];
  };
};
