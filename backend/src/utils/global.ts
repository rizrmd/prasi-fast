import { BunSqliteKeyValue } from "bun-sqlite-key-value";
import { join } from "path";

export const g = global as unknown as {
  sqlite: {
    objectHash: BunSqliteKeyValue;
  };
};

g.sqlite = {
  objectHash: new BunSqliteKeyValue(
    join(process.cwd(), "../../data/sqlite/object-hash.sqlite")
  ),
};
