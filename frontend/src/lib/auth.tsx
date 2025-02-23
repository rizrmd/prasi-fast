import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from '@generated/api';
import type { User } from '@prisma/client'

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

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    window.location.href = "/login";
    return null;
  }

  return <>{children}</>;
}
