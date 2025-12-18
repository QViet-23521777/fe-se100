"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";

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

const LoginPage = () => {
  const router = useRouter(); // ✅ Đúng vị trí
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch("http://localhost:3000/auth/customer/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Đăng nhập thất bại!");
        setIsLoading(false);
        return;
      }

      // ✅ Strip "Bearer " nếu backend trả về kèm prefix
      const cleanToken = data.token.replace(/^Bearer\s+/i, "").trim();

      // Lưu token thuần (không có "Bearer ")
      login(data.user, cleanToken);

      alert("Đăng nhập thành công!");
      router.push("/");
    } catch (err) {
      console.error(err);
      alert("Lỗi kết nối server!");
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

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="signup-card p-8 rounded-xl shadow-xl bg-dark-100 border border-dark-200">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-3">Đăng Nhập</h1>
            <p className="text-light-200 text-lg">
              Chào mừng bạn quay trở lại!
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
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
                  placeholder="example@email.com"
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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="bg-primary hover:bg-primary/90 transition text-black font-semibold py-3 rounded-lg text-lg disabled:opacity-50"
            >
              {isLoading ? "Đang xử lý..." : "Đăng nhập"}
            </button>

            {/* Link to Register */}
            <p className="text-center text-light-200 text-sm">
              Chưa có tài khoản?{" "}
              <button
                type="button"
                onClick={() => router.push("/user/register")}
                className="text-primary font-semibold hover:opacity-90"
              >
                Đăng ký ngay
              </button>
              {/* Hoặc dùng Link */}
              {/* <Link href="/register" className="text-primary font-semibold hover:opacity-90">Đăng ký ngay</Link> */}
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
