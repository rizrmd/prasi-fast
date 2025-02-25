import { ModelName, Models } from "shared/types";
import { rel } from ".";

export type LayoutTable<Name extends ModelName> = {
  columns: (
    | { col: Models[Name]["columns"][number] }
    | Rel<Name, Models[Name]["relations"][number]>
  )[];
};

type Rel<
  Name extends ModelName,
  Field extends Models[Name]["relations"][number]
> = {
  rel: Field;
  col: Models[Models[Name]["config"]["relations"][Field]["model"]]["columns"][number];
};
