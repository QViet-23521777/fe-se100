"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { usePublisher } from "@/app/context/PublisherContext";

// Icon Components
const MailIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
    <polyline points="22,6 12,13 2,6"></polyline>
  </svg>
);

const LockIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
  </svg>
);

export default function PublisherLoginPage() {
  const router = useRouter();
  const { user, login } = useAuth();
  const { setPublisherData } = usePublisher(); // ✅ Thêm này

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  // ✅ Kiểm tra nếu đã đăng nhập rồi thì redirect luôn
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      user &&
      user.accountType === "publisher"
    ) {
      console.log("✅ Đã đăng nhập, redirect đến game list");
      router.push(`/publisher/game/${user.id}`);
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
      const res = await fetch("http://localhost:3000/auth/publisher/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Đăng nhập thất bại!");
        return;
      }

      const { token, user: userData } = data;

      if (!userData || !userData.id) {
        setMessage("❌ Không thể lấy thông tin publisher!");
        return;
      }

      // ✅ Lưu thông tin vào AuthContext
      login(
        {
          id: userData.id,
          name: userData.publisherName || userData.name,
          email: userData.email,
          accountType: "publisher",
          publisherName: userData.publisherName,
        },
        token
      );

      setMessage("🎉 Đăng nhập thành công! Đang chuyển hướng...");

      // Redirect đến trang game list
      setTimeout(() => {
        router.push(`/publisher/game/${userData.id}`);
      }, 1000);
    } catch (err) {
      console.error(err);
      setMessage("❌ Lỗi kết nối server!");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Nếu đang kiểm tra auth, hiển thị loading
  if (
    typeof window !== "undefined" &&
    user &&
    user.accountType === "publisher"
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-light-200">Đang chuyển hướng...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="signup-card p-8 rounded-xl shadow-xl bg-dark-100 border border-dark-200">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-3">Publisher Login</h1>
            <p className="text-light-200 text-lg">Chào mừng quay trở lại!</p>
          </div>

          <div className="flex flex-col gap-6">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="text-light-100 text-base font-semibold mb-2 block"
              >
                Email
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-light-200">
                  <MailIcon />
                </div>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="publisher@email.com"
                  className="bg-dark-200 rounded-lg pl-12 pr-4 py-3 w-full text-light-100 placeholder:text-light-200/50 border border-dark-300 focus:border-primary focus:outline-none transition"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="text-light-100 text-base font-semibold mb-2 block"
              >
                Mật khẩu
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-light-200">
                  <LockIcon />
                </div>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="bg-dark-200 rounded-lg pl-12 pr-4 py-3 w-full text-light-100 placeholder:text-light-200/50 border border-dark-300 focus:border-primary focus:outline-none transition"
                  required
                />
              </div>
            </div>

            {/* Message */}
            {message && (
              <div
                className={`text-center text-sm font-medium p-3 rounded-lg ${
                  message.includes("thành công") || message.includes("🎉")
                    ? "bg-green-500/20 text-green-400 border border-green-500/50"
                    : "bg-red-500/20 text-red-400 border border-red-500/50"
                }`}
              >
                {message}
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="bg-primary hover:bg-primary/90 transition text-black font-semibold py-3 rounded-lg text-lg disabled:opacity-50"
            >
              {isLoading ? "Đang xử lý..." : "Đăng nhập"}
            </button>

            {/* Link to Register */}
            <p className="text-center text-light-200 text-sm">
              Chưa có tài khoản publisher?{" "}
              <button
                type="button"
                onClick={() => router.push("/publisher/register")}
                className="text-primary font-semibold hover:opacity-90"
              >
                Đăng ký ngay
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
