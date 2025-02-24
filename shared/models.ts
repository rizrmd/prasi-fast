import { ModelRegistry } from "system/model/model-registry";
import { User } from "./models/user";

export const user: User = ModelRegistry.getInstance("User", User);
