"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    phoneNumber: "",
    username: "",
    password: "",
    genderId: "",
  });
  const router = useRouter();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("Đang xử lý...");
    setLoading(true);

    console.log("📤 Đang gửi dữ liệu đăng ký:", formData);

    try {
      const res = await fetch("http://localhost:3000/auth/customer/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const responseText = await res.text();
      console.log("📥 Response:", responseText);

      let json;
      try {
        json = JSON.parse(responseText);
      } catch (parseError) {
        console.error("❌ Lỗi parse JSON:", parseError);
        setMessage(`Lỗi server: ${responseText}`);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        // Xử lý lỗi theo status code
        if (res.status === 409) {
          // Email/username/phone đã tồn tại
          const errorMsg =
            json.message ||
            json.error?.details ||
            "Email hoặc username đã được sử dụng";
          setMessage(`⚠️ ${errorMsg}`);
          console.error("🔴 409 Conflict:", errorMsg);
        } else if (res.status === 422) {
          // Lỗi validation
          setMessage(json.message || "Dữ liệu không hợp lệ");
          console.error("🔴 422 Validation Error:", json);
        } else {
          setMessage(json.message || "Đăng ký thất bại");
        }
      } else {
        // Thành công
        console.log("✅ Đăng ký thành công:", json);
        setMessage("✅ Đăng ký thành công! Đang chuyển đến trang đăng nhập...");

        // Reset form
        setFormData({
          email: "",
          phoneNumber: "",
          username: "",
          password: "",
          genderId: "",
        });

        // Chuyển đến trang login sau 2 giây
        setTimeout(() => {
          router.push("/user/login");
        }, 2000);
      }
    } catch (err) {
      console.error("❌ Lỗi network:", err);
      setMessage(
        err instanceof Error
          ? `Lỗi kết nối: ${err.message}`
          : "Lỗi không xác định"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="signup-card p-8 rounded-xl shadow-xl bg-dark-100 border border-dark-200">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-3">Đăng Ký</h1>
            <p className="text-light-200 text-lg">Tạo tài khoản mới của bạn</p>
          </div>

          <div className="flex flex-col gap-5">
            <div>
              <label className="text-light-100 text-base font-semibold mb-2 block">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="example@email.com"
                className="bg-dark-200 rounded-lg px-4 py-3 w-full text-light-100 placeholder:text-light-200/50 border border-dark-300 focus:border-primary focus:outline-none transition"
              />
            </div>

            <div>
              <label className="text-light-100 text-base font-semibold mb-2 block">
                Số điện thoại
              </label>
              <input
                type="text"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                required
                placeholder="0901234567"
                className="bg-dark-200 rounded-lg px-4 py-3 w-full text-light-100 placeholder:text-light-200/50 border border-dark-300 focus:border-primary focus:outline-none transition"
              />
            </div>

            <div>
              <label className="text-light-100 text-base font-semibold mb-2 block">
                Tên người dùng
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                placeholder="username123"
                className="bg-dark-200 rounded-lg px-4 py-3 w-full text-light-100 placeholder:text-light-200/50 border border-dark-300 focus:border-primary focus:outline-none transition"
              />
            </div>

            <div>
              <label className="text-light-100 text-base font-semibold mb-2 block">
                Mật khẩu
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={8}
                placeholder="••••••••"
                className="bg-dark-200 rounded-lg px-4 py-3 w-full text-light-100 placeholder:text-light-200/50 border border-dark-300 focus:border-primary focus:outline-none transition"
              />
              <p className="text-light-200/70 text-sm mt-1">
                Tối thiểu 8 ký tự
              </p>
            </div>

            <div>
              <label className="text-light-100 text-base font-semibold mb-2 block">
                Giới tính
              </label>
              <select
                name="genderId"
                value={formData.genderId}
                onChange={handleChange}
                required
                className="bg-dark-200 rounded-lg px-4 py-3 w-full text-light-100 border border-dark-300 focus:border-primary focus:outline-none transition"
              >
                <option value="">-- Chọn giới tính --</option>
                <option value="Male">Nam</option>
                <option value="Female">Nữ</option>
                <option value="Other">Khác</option>
              </select>
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-primary hover:bg-primary/90 transition text-black font-semibold py-3 rounded-lg text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Đang xử lý..." : "Đăng ký"}
            </button>

            <p className="text-center text-light-200 text-sm">
              Đã có tài khoản?{" "}
              <button
                type="button"
                onClick={() => router.push("/user/login")}
                className="text-primary font-semibold hover:opacity-90"
              >
                Đăng nhập ngay
              </button>
            </p>
          </div>

          {message && (
            <div
              className={`mt-4 p-3 rounded-lg text-center ${
                message.includes("✅")
                  ? "bg-green-500/20 text-green-400 border border-green-500/50"
                  : message.includes("⚠️")
                  ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/50"
                  : "bg-red-500/20 text-red-400 border border-red-500/50"
              }`}
            >
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
