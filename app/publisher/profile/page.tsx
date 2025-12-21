"use client";

import { useAuth } from "@/app/context/AuthContext";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface PublisherProfile {
  id: string;
  publisherName: string;
  email: string;
  phoneNumber: string;
  socialMedia?: string;
  bankType?: string;
  bankName?: string;
  contractDate: string;
  contractDuration: number;
  activityStatus: string;
  createdAt: string;
  updatedAt: string;
}

interface ContractInfo {
  contractDate: string;
  contractDuration: number;
  expiryDate: string;
  activityStatus: string;
  isActive: boolean;
  daysRemaining: number;
  isExpiringSoon: boolean;
}

interface Statistics {
  totalGames: number;
  releasedGames: number;
  upcomingGames: number;
  totalRevenue: number;
  activeContract: boolean;
  contractExpiryDate: string;
  daysUntilExpiry: number;
}

export default function PublisherProfilePage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<PublisherProfile | null>(null);
  const [contract, setContract] = useState<ContractInfo | null>(null);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    publisherName: "",
    phoneNumber: "",
    socialMedia: "",
    bankType: "",
    bankName: "",
  });

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const storedToken = localStorage.getItem("token");

      if (!storedToken) {
        throw new Error("No token found");
      }

      console.log("📡 Fetching publisher profile...");

      const response = await fetch("http://localhost:3000/publishers/me", {
        headers: {
          Authorization: `Bearer ${storedToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch profile: ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ Publisher profile received:", data);

      setProfile(data);
      setFormData({
        publisherName: data.publisherName || "",
        phoneNumber: data.phoneNumber || "",
        socialMedia: data.socialMedia || "",
        bankType: data.bankType || "",
        bankName: data.bankName || "",
      });

      // Fetch contract info
      fetchContract(storedToken);
      // Fetch statistics
      fetchStatistics(storedToken);
    } catch (error) {
      console.error("💥 Error fetching profile:", error);
      setError(error instanceof Error ? error.message : "Có lỗi xảy ra");

      if (error instanceof Error && error.message.includes("401")) {
        localStorage.clear();
        router.push("/publisher/login");
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  const fetchContract = async (storedToken: string) => {
    try {
      const response = await fetch(
        "http://localhost:3000/publishers/me/contract",
        {
          headers: {
            Authorization: `Bearer ${storedToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setContract(data);
      }
    } catch (error) {
      console.error("Error fetching contract:", error);
    }
  };

  const fetchStatistics = async (storedToken: string) => {
    try {
      const response = await fetch(
        "http://localhost:3000/publishers/me/statistics",
        {
          headers: {
            Authorization: `Bearer ${storedToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStatistics(data);
      }
    } catch (error) {
      console.error("Error fetching statistics:", error);
    }
  };

  useEffect(() => {
    const storedToken = localStorage.getItem("token");

    if (!storedToken || user?.accountType !== "publisher") {
      console.error("❌ Not a publisher or no token - redirecting");
      router.push("/publisher/login");
      return;
    }

    fetchProfile();
  }, [fetchProfile, router, user]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const storedToken = localStorage.getItem("token");

      const response = await fetch("http://localhost:3000/publishers/me", {
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
        <div className="text-xl">Không tìm thấy thông tin publisher</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen py-10">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Thông tin Publisher</h1>
          <p className="text-light-200">
            Quản lý thông tin nhà phát hành của bạn
          </p>
        </div>

        {/* Main Profile Card */}
        <div className="bg-dark-100 border-dark-200 border rounded-lg p-6 mb-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold mb-1">
                {profile.publisherName}
              </h2>
              <p className="text-light-200">{profile.email}</p>
              <span className="inline-block mt-2 text-xs bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded">
                Publisher Account
              </span>
            </div>
            <span
              className={`pill ${
                profile.activityStatus === "Active"
                  ? "bg-green-500/20 text-green-400"
                  : "bg-red-500/20 text-red-400"
              }`}
            >
              {profile.activityStatus}
            </span>
          </div>

          {!isEditing ? (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <InfoItem label="Tên Publisher" value={profile.publisherName} />
                <InfoItem label="Email" value={profile.email} />
                <InfoItem label="Số điện thoại" value={profile.phoneNumber} />
                <InfoItem
                  label="Social Media"
                  value={profile.socialMedia || "Chưa có"}
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
                  label="Ngày ký hợp đồng"
                  value={new Date(profile.contractDate).toLocaleDateString(
                    "vi-VN"
                  )}
                />
                <InfoItem
                  label="Thời hạn hợp đồng"
                  value={`${profile.contractDuration} tháng`}
                />
              </div>
            </div>
          ) : (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <FormInput
                  label="Tên Publisher"
                  value={formData.publisherName}
                  onChange={(e) =>
                    setFormData({ ...formData, publisherName: e.target.value })
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
                  label="Social Media"
                  value={formData.socialMedia}
                  onChange={(e) =>
                    setFormData({ ...formData, socialMedia: e.target.value })
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

        <div className="grid md:grid-cols-3 gap-6 mb-6">
          {/* Statistics Card */}
          {statistics && (
            <div className="bg-dark-100 border-dark-200 border rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4">📊 Thống kê</h3>
              <div className="space-y-3">
                <StatItem
                  label="Tổng số game"
                  value={statistics.totalGames.toString()}
                  icon="🎮"
                />
                <StatItem
                  label="Đã phát hành"
                  value={statistics.releasedGames.toString()}
                  icon="✅"
                />
                <StatItem
                  label="Sắp ra mắt"
                  value={statistics.upcomingGames.toString()}
                  icon="⏳"
                />
                <StatItem
                  label="Tổng doanh thu"
                  value={`${statistics.totalRevenue.toLocaleString()} VNĐ`}
                  icon="💰"
                />
              </div>
            </div>
          )}

          {/* Contract Card */}
          {contract && (
            <div className="bg-dark-100 border-dark-200 border rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4">📄 Hợp đồng</h3>
              <div className="space-y-3">
                <StatItem
                  label="Trạng thái"
                  value={contract.isActive ? "Còn hiệu lực" : "Hết hạn"}
                  icon={contract.isActive ? "✅" : "❌"}
                />
                <StatItem
                  label="Ngày hết hạn"
                  value={new Date(contract.expiryDate).toLocaleDateString(
                    "vi-VN"
                  )}
                  icon="📅"
                />
                <StatItem
                  label="Số ngày còn lại"
                  value={`${contract.daysRemaining} ngày`}
                  icon="⏰"
                />
                {contract.isExpiringSoon && (
                  <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <p className="text-yellow-400 text-sm">
                      ⚠️ Hợp đồng sắp hết hạn! Vui lòng liên hệ để gia hạn.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bank Info Card */}
          <div className="bg-dark-100 border-dark-200 border rounded-lg p-6">
            <h3 className="text-xl font-bold mb-4">🏦 Ngân hàng</h3>
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

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-4">
          <button
            onClick={() => router.push(`/publisher/game/${user?.id}`)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-4 rounded-lg font-semibold transition flex items-center justify-center gap-3"
          >
            <span className="text-2xl">🎮</span>
            <span>Quản lý Game của tôi</span>
          </button>
          <button
            onClick={() => router.push("/publisher/change-password")}
            className="bg-dark-200 hover:bg-dark-300 px-6 py-4 rounded-lg font-semibold transition flex items-center justify-center gap-3"
          >
            <span className="text-2xl">🔒</span>
            <span>Đổi mật khẩu</span>
          </button>
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
