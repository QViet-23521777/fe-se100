"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface User {
  id?: string;
  name?: string;
  email?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Load user 1 lần duy nhất — không dùng effect!
  const [user, setUser] = useState<User | null>(() => {
    try {
      if (typeof window === "undefined") return null;
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Load token đúng chuẩn
  const [token, setToken] = useState<string | null>(() => {
    try {
      if (typeof window === "undefined") return null;
      return localStorage.getItem("token");
    } catch {
      return null;
    }
  });

  const login = (userData: User, jwt: string) => {
    // ✅ ĐÚNG - Chỉ lưu token thuần, KHÔNG thêm "Bearer "
    const cleanToken = jwt.replace(/^Bearer\s+/i, "").trim();

    setUser(userData);
    setToken(cleanToken); // ✅ Lưu token thuần

    try {
      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("token", cleanToken); // ✅ Lưu token thuần
    } catch {}
  };

  const logout = () => {
    setUser(null);
    setToken(null);

    try {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
