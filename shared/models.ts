import { ModelRegistry } from "system/model/model-registry";
import { User } from "./models/user";
import { Role } from "./models/role";

export const user: User = ModelRegistry.getInstance("User", User);
export const role: Role = ModelRegistry.getInstance("Role", Role);
