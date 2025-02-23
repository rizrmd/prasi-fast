// This file is auto-generated. Do not edit manually.
import { apiClient } from "system/api/client";
import type authRegister from "backend/src/api/auth-register";
import type authLogin from "backend/src/api/auth-login";
import type authLogout from "backend/src/api/auth-logout";
import type authCheck from "backend/src/api/auth-check";

export const api = {
  authRegister: apiClient<typeof authRegister>("/auth/register"),
  authLogin: apiClient<typeof authLogin>("/auth/login"),
  authLogout: apiClient<typeof authLogout>("/auth/logout"),
  authCheck: apiClient<typeof authCheck>("/auth/check"),
};
