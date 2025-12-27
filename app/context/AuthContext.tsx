"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

interface User {
  id?: string;
  name?: string;
  email?: string;
  accountType?: "customer" | "publisher" | "admin";
  publisherName?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ✅ OPTIMIZED: Chỉ load từ localStorage, KHÔNG validate
  useEffect(() => {
    if (typeof window === "undefined") {
      setIsLoading(false);
      return;
    }

    try {
      const storedUser = localStorage.getItem("user");
      const storedToken = localStorage.getItem("token");

      // Không có data → skip
      if (!storedUser || !storedToken) {
        setIsLoading(false);
        return;
      }

      const parsedUser = JSON.parse(storedUser);

      // Validate cơ bản
      if (!parsedUser || (!parsedUser.id && !parsedUser.email)) {
        throw new Error("Invalid user data");
      }

      // ✅ Restore session ngay lập tức (KHÔNG gọi API)
      setUser(parsedUser);
      setToken(storedToken);
    } catch (error) {
      console.error("Auth restore failed:", error);
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("publisher");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = (userData: User, jwt: string) => {
    const cleanToken = jwt.replace(/^Bearer\s+/i, "").trim();

    setUser(userData);
    setToken(cleanToken);

    try {
      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("token", cleanToken);
    } catch (error) {
      console.error("Failed to save auth:", error);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);

    try {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("publisher");
    } catch (error) {
      console.error("Failed to clear auth:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
