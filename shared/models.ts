import { Role } from "./models/role/model";
import { ModelRegistry } from "system/model/model-registry";
import { User } from "./models/user/model";

export const role: Role = ModelRegistry.getInstance("Role", Role);
export const user: User = ModelRegistry.getInstance("User", User);
