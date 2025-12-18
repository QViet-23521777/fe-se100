"use client";

import { useAuth } from "@/app/context/AuthContext";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface UserProfile {
  id: string;
  email: string;
  phoneNumber: string;
  username: string;
  password?: string;
  fullName?: string;
  genderId?: string;
  registrationDate: string;
  accountStatus: string;
  accountBalance: number;
  bankType: string;
  bankName: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export default function ProfilePage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    username: "",
    phoneNumber: "",
    bankType: "",
    bankName: "",
    description: "",
  });

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    console.log("🔍 DEBUG Profile Page:");
    console.log("Token from localStorage:", storedToken);
    console.log("User from localStorage:", storedUser);
    console.log("AuthContext user:", user);
    console.log("AuthContext token:", token);

    if (!storedToken) {
      console.error("❌ No token - redirecting to login");
      router.push("/user/login");
      return;
    }

    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const storedToken = localStorage.getItem("token");

      if (!storedToken) {
        throw new Error("No token found");
      }

      console.log(
        "📡 Calling API with token:",
        storedToken.substring(0, 20) + "..."
      );

      // ✅ FIXED: Port 3000 (không phải 3001)
      const response = await fetch("http://localhost:3000/customers/me", {
        headers: {
          Authorization: `Bearer ${storedToken}`,
          "Content-Type": "application/json",
        },
      });

      console.log("📥 Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Error response:", errorText);
        throw new Error(`Failed to fetch profile: ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ Profile data received:", data);

      setProfile(data);
      setFormData({
        username: data.username || "",
        phoneNumber: data.phoneNumber || "",
        bankType: data.bankType || "",
        bankName: data.bankName || "",
        description: data.description || "",
      });
    } catch (error) {
      console.error("💥 Error fetching profile:", error);
      setError(error instanceof Error ? error.message : "Có lỗi xảy ra");

      // Nếu lỗi 401 (Unauthorized), redirect về login
      if (error instanceof Error && error.message.includes("401")) {
        localStorage.clear();
        router.push("/user/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const storedToken = localStorage.getItem("token");

      // ✅ FIXED: Port 3000
      const response = await fetch("http://localhost:3000/customers/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${storedToken}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const updated = await response.json();
        setProfile(updated);
        setIsEditing(false);
        alert("✅ Cập nhật thông tin thành công!");
      } else {
        const errorText = await response.text();
        console.error("Update error:", errorText);
        alert("❌ Cập nhật thất bại!");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("❌ Có lỗi xảy ra!");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl animate-pulse">Đang tải thông tin...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-xl text-red-400 mb-4">❌ {error}</div>
          <button
            onClick={fetchProfile}
            className="bg-primary hover:bg-primary/90 text-black px-6 py-2 rounded-lg"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Không tìm thấy thông tin người dùng</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen py-10">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Thông tin tài khoản</h1>
          <p className="text-light-200">Quản lý thông tin cá nhân của bạn</p>
        </div>

        <div className="bg-dark-100 border-dark-200 border rounded-lg p-6 mb-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold mb-1">
                {profile.fullName || profile.username || "User"}
              </h2>
              <p className="text-light-200">{profile.email}</p>
            </div>
            <span
              className={`pill ${
                profile.accountStatus === "Active"
                  ? "bg-green-500/20 text-green-400"
                  : "bg-red-500/20 text-red-400"
              }`}
            >
              {profile.accountStatus}
            </span>
          </div>

          {!isEditing ? (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <InfoItem label="Username" value={profile.username} />
                <InfoItem label="Email" value={profile.email} />
                <InfoItem label="Số điện thoại" value={profile.phoneNumber} />
                <InfoItem
                  label="Số dư tài khoản"
                  value={`${profile.accountBalance.toLocaleString()} VNĐ`}
                />
                <InfoItem
                  label="Ngày đăng ký"
                  value={new Date(profile.registrationDate).toLocaleDateString(
                    "vi-VN"
                  )}
                />
              </div>

              <div className="space-y-4">
                <InfoItem
                  label="Loại ngân hàng"
                  value={profile.bankType || "Chưa có"}
                />
                <InfoItem
                  label="Tên ngân hàng"
                  value={profile.bankName || "Chưa có"}
                />
                <InfoItem
                  label="Mô tả"
                  value={profile.description || "Chưa có"}
                />
                <InfoItem
                  label="Cập nhật lần cuối"
                  value={new Date(profile.updatedAt).toLocaleString("vi-VN")}
                />
              </div>
            </div>
          ) : (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <FormInput
                  label="Username"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                />
                <FormInput
                  label="Số điện thoại"
                  value={formData.phoneNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, phoneNumber: e.target.value })
                  }
                />
                <FormInput
                  label="Loại ngân hàng"
                  value={formData.bankType}
                  onChange={(e) =>
                    setFormData({ ...formData, bankType: e.target.value })
                  }
                />
                <FormInput
                  label="Tên ngân hàng"
                  value={formData.bankName}
                  onChange={(e) =>
                    setFormData({ ...formData, bankName: e.target.value })
                  }
                />
              </div>
              <FormTextarea
                label="Mô tả"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="bg-primary hover:bg-primary/90 text-black px-6 py-2.5 rounded-lg font-semibold transition"
                >
                  Lưu thay đổi
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="bg-dark-200 hover:bg-dark-200/80 px-6 py-2.5 rounded-lg transition"
                >
                  Hủy
                </button>
              </div>
            </form>
          )}

          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="bg-primary hover:bg-primary/90 text-black px-6 py-2.5 rounded-lg font-semibold transition mt-6"
            >
              Chỉnh sửa thông tin
            </button>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-dark-100 border-dark-200 border rounded-lg p-6">
            <h3 className="text-xl font-bold mb-4">Thống kê tài khoản</h3>
            <div className="space-y-3">
              <StatItem
                label="Tổng số dư"
                value={`${profile.accountBalance.toLocaleString()} VNĐ`}
                icon="💰"
              />
              <StatItem
                label="Trạng thái"
                value={profile.accountStatus}
                icon="✅"
              />
              <StatItem
                label="Thời gian tham gia"
                value={
                  Math.floor(
                    (new Date().getTime() -
                      new Date(profile.registrationDate).getTime()) /
                      (1000 * 60 * 60 * 24)
                  ) + " ngày"
                }
                icon="📅"
              />
            </div>
          </div>

          <div className="bg-dark-100 border-dark-200 border rounded-lg p-6">
            <h3 className="text-xl font-bold mb-4">Thông tin ngân hàng</h3>
            <div className="space-y-3">
              <StatItem
                label="Loại"
                value={profile.bankType || "Chưa cập nhật"}
                icon="🏦"
              />
              <StatItem
                label="Ngân hàng"
                value={profile.bankName || "Chưa cập nhật"}
                icon="💳"
              />
              <StatItem
                label="Số điện thoại"
                value={profile.phoneNumber}
                icon="📱"
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-light-200 text-sm mb-1">{label}</p>
      <p className="text-white font-medium">{value}</p>
    </div>
  );
}

function FormInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <label className="text-light-200 text-sm mb-2 block">{label}</label>
      <input
        type="text"
        value={value}
        onChange={onChange}
        className="w-full bg-dark-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  );
}

function FormTextarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}) {
  return (
    <div>
      <label className="text-light-200 text-sm mb-2 block">{label}</label>
      <textarea
        value={value}
        onChange={onChange}
        rows={3}
        className="w-full bg-dark-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  );
}

function StatItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-light-200 text-sm">{label}</p>
        <p className="text-white font-medium">{value}</p>
      </div>
    </div>
  );
}
