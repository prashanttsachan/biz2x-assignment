"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  apiFetch,
  AuthUser,
  clearAuth,
  getStoredUser,
  getToken,
  setAuth,
} from "@/lib/client/api";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const token = getToken();
      const stored = getStoredUser();
      if (!token || !stored) {
        setLoading(false);
        return;
      }

      try {
        const data = await apiFetch<{ user: AuthUser }>("/api/auth/me");
        setUser(data.user);
      } catch {
        clearAuth();
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    void init();
  }, []);

  async function login(email: string, password: string) {
    const data = await apiFetch<{
      token: string;
      user: AuthUser;
    }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setAuth(data.token, data.user);
    setUser(data.user);
  }

  async function logout() {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {
    }
    clearAuth();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
