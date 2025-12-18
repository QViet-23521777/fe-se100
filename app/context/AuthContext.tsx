"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface User {
  id?: string;
  name?: string;
  email?: string;
  accountType?: "customer" | "publisher" | "admin"; // ✅ Đã có rồi
  publisherName?: string; // ✅ THÊM: Tên publisher (nếu là publisher)
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      if (typeof window === "undefined") return null;
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    try {
      if (typeof window === "undefined") return null;
      return localStorage.getItem("token");
    } catch {
      return null;
    }
  });

  const login = (userData: User, jwt: string) => {
    const cleanToken = jwt.replace(/^Bearer\s+/i, "").trim();

    setUser(userData);
    setToken(cleanToken);

    try {
      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("token", cleanToken);
    } catch {}
  };

  const logout = () => {
    setUser(null);
    setToken(null);

    try {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("publisher"); // ✅ THÊM: Xóa publisher cũ nếu có
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
