"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";

interface GameFormData {
  name: string;
  genre: string;
  description: string;
  imageUrl: string;
  videoUrl: string;
  releaseDate: string;
  version: string;
  originalPrice: number;
  discountPrice: number;
  releaseStatus: string;
}

interface Game extends GameFormData {
  id: string;
  publisherId: string;
  createdAt: string;
  updatedAt: string;
}

export default function EditGamePage() {
  const params = useParams();
  const router = useRouter();
  const { user, token } = useAuth();
  const gameId = params.gameId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [game, setGame] = useState<Game | null>(null);

  const [formData, setFormData] = useState<GameFormData>({
    name: "",
    genre: "",
    description: "",
    imageUrl: "",
    videoUrl: "",
    releaseDate: "",
    version: "",
    originalPrice: 0,
    discountPrice: 0,
    releaseStatus: "Upcoming",
  });

  // Check authentication first
  useEffect(() => {
    if (!user || !token) {
      alert("⚠️ Vui lòng đăng nhập!");
      router.push("/publisher/login");
      return;
    }

    if (user.accountType !== "publisher") {
      alert("⚠️ Chỉ publisher mới có thể chỉnh sửa game!");
      router.push("/publisher/login");
      return;
    }
  }, [user, token, router]);

  // Fetch game data
  useEffect(() => {
    const fetchGame = async () => {
      if (!gameId || !token) return;

      try {
        setLoading(true);
        console.log("🔄 Fetching game:", gameId);

        const res = await fetch(`http://localhost:3000/games/${gameId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error("❌ Fetch error:", errorText);
          throw new Error(`Failed to fetch game: ${res.status}`);
        }

        const gameData = await res.json();
        console.log("✅ Game data received:", gameData);

        // ⚠️ KIỂM TRA QUYỀN SỞ HỮU
        if (gameData.publisherId !== user?.id) {
          console.error("❌ Publisher mismatch!");
          console.log("Game publisherId:", gameData.publisherId);
          console.log("User id:", user?.id);
          setError("⚠️ Bạn không có quyền chỉnh sửa game này!");
          return;
        }

        setGame(gameData);

        // Convert date to YYYY-MM-DD format
        const releaseDate = gameData.releaseDate
          ? new Date(gameData.releaseDate).toISOString().split("T")[0]
          : "";

        setFormData({
          name: gameData.name || "",
          genre: gameData.genre || "",
          description: gameData.description || "",
          imageUrl: gameData.imageUrl || "",
          videoUrl: gameData.videoUrl || "",
          releaseDate,
          version: gameData.version || "",
          originalPrice: gameData.originalPrice || 0,
          discountPrice: gameData.discountPrice || 0,
          releaseStatus: gameData.releaseStatus || "Upcoming",
        });
      } catch (err) {
        console.error("💥 Error:", err);
        setError("Không thể tải thông tin game");
      } finally {
        setLoading(false);
      }
    };

    if (user && token) {
      fetchGame();
    }
  }, [gameId, token, user]);

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Double check ownership
    if (game?.publisherId !== user?.id) {
      alert("❌ Bạn không có quyền chỉnh sửa game này!");
      return;
    }

    // Validation
    if (!formData.name.trim()) {
      alert("Vui lòng nhập tên game!");
      return;
    }
    if (formData.originalPrice < 0 || formData.discountPrice < 0) {
      alert("Giá không được âm!");
      return;
    }
    if (formData.discountPrice > formData.originalPrice) {
      alert("Giá giảm không được lớn hơn giá gốc!");
      return;
    }

    try {
      setSaving(true);
      console.log("💾 Updating game:", gameId);
      console.log("📦 Data:", formData);
      console.log("🔑 Token:", token?.substring(0, 20) + "...");

      const res = await fetch(`http://localhost:3000/games/${gameId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          originalPrice: Number(formData.originalPrice),
          discountPrice: Number(formData.discountPrice),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error("❌ Update error:", errorData);
        throw new Error(errorData.message || "Failed to update game");
      }

      const updated = await res.json();
      console.log("✅ Game updated:", updated);

      alert("✅ Cập nhật game thành công!");
      router.push(`/publisher/game/${user?.id}`);
    } catch (err: any) {
      console.error("💥 Submit error:", err);
      alert(`❌ Không thể cập nhật game: ${err.message || "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
          <p className="text-gray-400">Đang tải thông tin game...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-xl mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 text-xl mb-4">Không tìm thấy game</p>
          <button
            onClick={() => router.back()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">✏️ Chỉnh sửa Game</h1>
        <p className="text-gray-400">Cập nhật thông tin game của bạn</p>
        <p className="text-xs text-gray-500 mt-1">
          Game ID: {game.id} | Publisher ID: {game.publisherId}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-slate-800 rounded-xl p-6 space-y-6"
      >
        {/* Game Name */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Tên Game <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full bg-slate-700 border border-slate-600 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500"
            required
          />
        </div>

        {/* Genre & Version */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Thể loại</label>
            <input
              type="text"
              value={formData.genre}
              onChange={(e) =>
                setFormData({ ...formData, genre: e.target.value })
              }
              className="w-full bg-slate-700 border border-slate-600 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="VD: Action, RPG, Strategy..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Version</label>
            <input
              type="text"
              value={formData.version}
              onChange={(e) =>
                setFormData({ ...formData, version: e.target.value })
              }
              className="w-full bg-slate-700 border border-slate-600 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="VD: 1.0.0"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-2">Mô tả</label>
          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            rows={4}
            className="w-full bg-slate-700 border border-slate-600 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500"
            placeholder="Mô tả chi tiết về game..."
          />
        </div>

        {/* Image URL */}
        <div>
          <label className="block text-sm font-medium mb-2">URL Hình ảnh</label>
          <input
            type="url"
            value={formData.imageUrl}
            onChange={(e) =>
              setFormData({ ...formData, imageUrl: e.target.value })
            }
            className="w-full bg-slate-700 border border-slate-600 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500"
            placeholder="https://example.com/image.jpg"
          />
          {formData.imageUrl && (
            <div className="mt-2">
              <img
                src={formData.imageUrl}
                alt="Preview"
                className="h-32 rounded-lg object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src =
                    "https://via.placeholder.com/400x300?text=Invalid+URL";
                }}
              />
            </div>
          )}
        </div>

        {/* Video URL */}
        <div>
          <label className="block text-sm font-medium mb-2">
            URL Video/Trailer
          </label>
          <input
            type="url"
            value={formData.videoUrl}
            onChange={(e) =>
              setFormData({ ...formData, videoUrl: e.target.value })
            }
            className="w-full bg-slate-700 border border-slate-600 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500"
            placeholder="https://youtube.com/watch?v=..."
          />
        </div>

        {/* Release Date & Status */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Ngày phát hành
            </label>
            <input
              type="date"
              value={formData.releaseDate}
              onChange={(e) =>
                setFormData({ ...formData, releaseDate: e.target.value })
              }
              className="w-full bg-slate-700 border border-slate-600 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Trạng thái</label>
            <select
              value={formData.releaseStatus}
              onChange={(e) =>
                setFormData({ ...formData, releaseStatus: e.target.value })
              }
              className="w-full bg-slate-700 border border-slate-600 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="Upcoming">Sắp ra mắt</option>
              <option value="Released">Đã phát hành</option>
            </select>
          </div>
        </div>

        {/* Pricing */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Giá gốc (VNĐ)
            </label>
            <input
              type="number"
              value={formData.originalPrice}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  originalPrice: Number(e.target.value),
                })
              }
              className="w-full bg-slate-700 border border-slate-600 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500"
              min="0"
              step="1000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Giá giảm (VNĐ)
            </label>
            <input
              type="number"
              value={formData.discountPrice}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  discountPrice: Number(e.target.value),
                })
              }
              className="w-full bg-slate-700 border border-slate-600 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500"
              min="0"
              step="1000"
            />
          </div>
        </div>

        {/* Discount Preview */}
        {formData.originalPrice > 0 &&
          formData.discountPrice < formData.originalPrice && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <p className="text-green-400">
                💰 Giảm giá:{" "}
                <span className="font-bold">
                  {Math.round(
                    ((formData.originalPrice - formData.discountPrice) /
                      formData.originalPrice) *
                      100
                  )}
                  %
                </span>
              </p>
            </div>
          )}

        {/* Action Buttons */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition"
          >
            {saving ? "⏳ Đang lưu..." : "💾 Lưu thay đổi"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-lg transition"
          >
            ❌ Hủy
          </button>
        </div>
      </form>
    </div>
  );
}
