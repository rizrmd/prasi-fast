import { Role as ModelRole } from "./models/role/model";
import { User as ModelUser} from "./models/user/model";
import { ModelRegistry } from "system/model/model-registry";

export const Role: ModelRole = ModelRegistry.getInstance("Role", ModelRole);
export const User: ModelUser = ModelRegistry.getInstance("User", ModelUser);
