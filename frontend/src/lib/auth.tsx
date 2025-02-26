import { Logo } from "@/components/app/logo";
import { Spinner } from "@/components/ui/spinner";
import { useLocal } from "@/hooks/use-local";
import { api } from "@generated/api";
import type { User } from "@prisma/client";
import React, { createContext, useContext, useEffect, useState } from "react";

interface AuthContextType {
  user: Partial<User> | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (
    username: string,
    password: string,
    email: string
  ) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const local = useLocal({
    user: null as Partial<User> | null,
    loading: true,
  });

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await api.authCheck();
        if ("error" in response) {
          console.log("Session check failed:", response.error);

          local.loading = false;
          local.render();
          return;
        }
        local.user = response.user;
      } catch (error) {
        console.error("Session check failed:", error);
      } finally {
        local.loading = false;
        local.render();
      }
    };

    checkSession();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.authLogin({ username: email, password });
    if ("error" in response) {
      throw new Error(response.error);
    }
    local.user = response.user;
    local.render();
  };

  const register = async (
    username: string,
    password: string,
    email: string
  ) => {
    const response = await api.authRegister({ email, password, username });
    if ("error" in response) {
      throw new Error(response.error);
    }
    local.user = response.user;
    local.render();
  };

  const logout = async () => {
    const response = await api.authLogout();
    if ("error" in response) {
      throw new Error(response.error);
    }
    if (response.success) {
      local.user = null;
      local.render();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: local.user,
        isLoading: local.loading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Store and retrieve redirect path
export const storeRedirectPath = (path: string) => {
  sessionStorage.setItem("redirectPath", path);
};

export const getStoredRedirectPath = () => {
  const path = sessionStorage.getItem("redirectPath");
  sessionStorage.removeItem("redirectPath"); // Clear it after getting it
  return path;
};

export function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col w-full h-full space-y-[10px]">
        <Spinner className="w-[30px] h-[30px] opacity-50" />
        <Logo />
      </div>
    );
  }

  if (user) {
    window.location.href = "/";
    return null;
  }

  return <>{children}</>;
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (!user) {
    storeRedirectPath(window.location.pathname);
    window.location.href = "/auth/login";
    return null;
  }

  return <>{children}</>;
}