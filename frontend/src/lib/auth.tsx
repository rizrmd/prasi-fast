import { Logo } from "@/components/app/logo";
import { Spinner } from "@/components/ui/spinner";
import { api } from '@generated/api';
import type { User } from '@prisma/client';
import React, { createContext, useContext, useEffect, useState } from "react";

interface AuthContextType {
  user: Partial<User> | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Partial<User> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await api.authCheck();
        if ('error' in response) {
          console.log("Session check failed:", response.error);
          return;
        }
        setUser(response.user);
      } catch (error) {
        console.error("Session check failed:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.authLogin({ username: email, password });
    if ('error' in response) {
      throw new Error(response.error);
    }
    setUser(response.user);
  };

  const register = async (username: string, password: string, email: string) => {
    const response = await api.authRegister({ email, password, username });
    if ('error' in response) {
      throw new Error(response.error);
    }
    setUser(response.user);
  };

  const logout = async () => {
    const response = await api.authLogout();
    if ('error' in response) {
      throw new Error(response.error);
    }
    if (response.success) {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
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
  sessionStorage.setItem('redirectPath', path);
};

export const getStoredRedirectPath = () => {
  const path = sessionStorage.getItem('redirectPath');
  sessionStorage.removeItem('redirectPath'); // Clear it after getting it
  return path;
};

export function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center flex-col w-full h-full space-y-[10px]">
      <Spinner className="w-[30px] h-[30px] opacity-50" />
      <Logo />
    </div>;
  }

  if (user) {
    window.location.href = "/";
    return null;
  }

  return <>{children}</>;
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center flex-col w-full h-full space-y-[10px]">
      <Spinner className="w-[30px] h-[30px] opacity-50" />
      <Logo />
    </div>;
  }

  if (!user) {
    storeRedirectPath(window.location.pathname);
    window.location.href = "/auth/login";
    return null;
  }

  return <>{children}</>;
}
