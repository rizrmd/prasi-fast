// This file is auto-generated. Do not edit manually.
import { apiClient } from "system/api/client";
import type authLogin from "backend/src/api/auth-login";

export const api = {
  authLogin: apiClient<typeof authLogin>("/auth/login"),
};
