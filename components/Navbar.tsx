"use client";

import Link from "next/link";
import { useAuth } from "@/app/context/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";

export default function NavBar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ✅ GIẢI PHÁP TỐT NHẤT: Dùng state bình thường + suppressHydrationWarning
  const [mounted, setMounted] = useState(false);

  // Set mounted sau khi component đã hydrate
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (pathname === "/") return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [pathname]);

  const isPublisher = user?.accountType === "publisher";

  const handleLogout = () => {
    logout();
    setShowDropdown(false);
    router.push("/");
  };

  const handleManageGames = () => {
    if (!user) {
      router.push("/publisher/login");
      return;
    }

    if (!isPublisher) {
      alert("⚠️ Bạn cần đăng nhập bằng tài khoản Publisher để quản lý game!");
      router.push("/publisher/login");
      return;
    }

    router.push(`/publisher/game/${user.id}`);
  };

  const handleProfileClick = () => {
    setShowDropdown(false);
    router.push("/user/profile");
  };

  if (
    pathname === "/" ||
    pathname === "/browse" ||
    pathname.startsWith("/user/login")
  ) {
    return null;
  }

  return (
    <nav className="w-full flex items-center justify-between px-6 py-4 bg-gray-900 text-white shadow glass sticky top-0 z-50">
      <div className="flex items-center gap-6">
        <Link href="/" className="hover:text-yellow-300 font-bold text-xl logo">
          🎮 Game Hub
        </Link>
      </div>

      <div className="flex items-center gap-6">
        <Link href="/" className="hover:text-yellow-300 transition">
          Home
        </Link>

        <button
          type="button"
          onClick={handleManageGames}
          className="hover:text-yellow-300 transition cursor-pointer bg-transparent border-none"
          suppressHydrationWarning
        >
          {mounted && user && isPublisher ? "Quản lý Game" : "Thêm Game"}
        </button>

        {/* User Menu - suppressHydrationWarning để tránh warning SSR/CSR mismatch */}
        <div suppressHydrationWarning>
          {mounted ? (
            <>
              {user ? (
                <div className="relative" ref={dropdownRef}>
                  {/* User Button */}
                  <button
                    type="button"
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center gap-2 hover:text-yellow-300 transition cursor-pointer bg-transparent border-none"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center font-bold text-black">
                      {user.name?.charAt(0).toUpperCase() ||
                        user.email?.charAt(0).toUpperCase() ||
                        "U"}
                    </div>
                    <span className="font-medium max-sm:hidden">
                      {user.name || user.email}
                      {isPublisher && (
                        <span className="text-xs ml-1 text-yellow-300">
                          (Publisher)
                        </span>
                      )}
                    </span>
                    <svg
                      className={`w-4 h-4 transition-transform ${
                        showDropdown ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {showDropdown && (
                    <div className="absolute right-0 mt-2 w-64 bg-dark-100 border border-dark-200 rounded-lg shadow-lg overflow-hidden">
                      {/* User Info */}
                      <div className="px-4 py-3 border-b border-dark-200">
                        <p className="font-semibold text-white">
                          {user.name || "User"}
                        </p>
                        <p className="text-sm text-light-200">
                          {user.email || "No email"}
                        </p>
                        {isPublisher && (
                          <span className="inline-block mt-2 text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded">
                            Publisher Account
                          </span>
                        )}
                      </div>

                      {/* Menu Items */}
                      <div className="py-2">
                        <button
                          onClick={handleProfileClick}
                          className="w-full text-left px-4 py-2 hover:bg-dark-200 transition flex items-center gap-3"
                        >
                          <span className="text-xl">👤</span>
                          <span>Thông tin tài khoản</span>
                        </button>

                        {isPublisher && (
                          <button
                            onClick={() => {
                              setShowDropdown(false);
                              router.push(`/publisher/game/${user.id}`);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-dark-200 transition flex items-center gap-3"
                          >
                            <span className="text-xl">🎮</span>
                            <span>Quản lý Game</span>
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setShowDropdown(false);
                            router.push("/user/orders");
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-dark-200 transition flex items-center gap-3"
                        >
                          <span className="text-xl">📦</span>
                          <span>Đơn hàng của tôi</span>
                        </button>

                        <button
                          onClick={() => {
                            setShowDropdown(false);
                            router.push("/user/settings");
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-dark-200 transition flex items-center gap-3"
                        >
                          <span className="text-xl">⚙️</span>
                          <span>Cài đặt</span>
                        </button>
                      </div>

                      {/* Logout */}
                      <div className="border-t border-dark-200 py-2">
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-2 hover:bg-red-500/10 text-red-400 transition flex items-center gap-3"
                        >
                          <span className="text-xl">🚪</span>
                          <span>Đăng xuất</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex gap-2">
                  <Link
                    href="/user/login"
                    className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded transition"
                  >
                    Đăng nhập
                  </Link>
                </div>
              )}
            </>
          ) : (
            <div className="w-32 h-10 bg-blue-500/20 rounded animate-pulse" />
          )}
        </div>
      </div>
    </nav>
  );
}
