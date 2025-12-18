"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

/**
 * Hook để bảo vệ route - redirect về login nếu chưa đăng nhập
 * @param requirePublisher - Nếu true, yêu cầu user phải là publisher
 */
export function useProtectedRoute(requirePublisher: boolean = false) {
  const { user, token } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Chỉ check khi đã load xong client
    if (typeof window === "undefined") return;

    // Chưa đăng nhập -> redirect về login
    if (!user || !token) {
      const loginPath = requirePublisher ? "/publisher/login" : "/user/login";
      router.push(loginPath);
      return;
    }

    // Nếu yêu cầu publisher nhưng user không phải publisher
    if (requirePublisher && user.accountType !== "publisher") {
      alert("Bạn cần đăng nhập bằng tài khoản Publisher!");
      router.push("/publisher/login");
      return;
    }
  }, [user, token, router, requirePublisher]);

  return { user, token, isAuthenticated: !!(user && token) };
}

/**
 * HOC (Higher Order Component) để wrap protected pages
 */
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  requirePublisher: boolean = false
) {
  return function ProtectedComponent(props: P) {
    const { isAuthenticated } = useProtectedRoute(requirePublisher);

    // Hiển thị loading trong khi check auth
    if (!isAuthenticated) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-light-200">Đang kiểm tra đăng nhập...</p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}
