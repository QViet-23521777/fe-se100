"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";
import { gameStoreApiUrl } from "@/lib/game-store-api";

// ❌ XÓA publisherId khỏi interface
interface GameForm {
  name: string;
  genre: string;
  description: string;
  imageUrl: string;
  videoUrl: string;
  releaseDate: string;
  version: string;
  originalPrice: number;
  discountPrice: number;
  // ❌ XÓA: publisherId
}

export default function CreateGamePage() {
  const router = useRouter();
  const { token, user } = useAuth();

  const [form, setForm] = useState<GameForm>({
    name: "",
    genre: "",
    description: "",
    imageUrl: "",
    videoUrl: "",
    releaseDate: "",
    version: "",
    originalPrice: 0,
    discountPrice: 0,
    // ❌ XÓA: publisherId
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // ✅ Check authentication
  if (!user || user.accountType !== "publisher") {
    return (
      <div className="max-w-3xl mx-auto mt-10 p-10">
        <div className="bg-red-500/20 border border-red-500 p-4 rounded-lg text-center">
          <p className="text-red-300 mb-4">
            ❌ Bạn cần đăng nhập với tài khoản Publisher
          </p>
          <button
            onClick={() => router.push("/login/publisher")}
            className="bg-primary text-black px-6 py-2 rounded-lg font-semibold hover:bg-primary/90"
          >
            Đăng nhập Publisher
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // 🎲 RANDOM GENERATOR
  // ---------------------------------------------------------
  const randomGame = (): GameForm => {
    const randomNames = [
      "Dragon Quest Online",
      "Cyber Runner 2077",
      "Mystic Forest",
      "Galaxy Battle Arena",
      "Racing Rush X",
      "Shadow Hunter",
      "Survival Island",
    ];

    const randomGenres = [
      "Action",
      "RPG",
      "Adventure",
      "Shooter",
      "Strategy",
      "Puzzle",
    ];

    const randomDescriptions = [
      "Một cuộc phiêu lưu kỳ bí đầy thử thách.",
      "Game bắn súng tốc độ cao với đồ họa hiện đại.",
      "Khám phá thế giới mở rộng lớn chưa từng có.",
      "Tham gia chiến trường không gian khốc liệt.",
      "Đua xe tốc độ với nhiều chế độ chơi hấp dẫn.",
      "Sống sót giữa hòn đảo hoang đầy nguy hiểm.",
    ];

    return {
      name: randomNames[Math.floor(Math.random() * randomNames.length)],
      genre: randomGenres[Math.floor(Math.random() * randomGenres.length)],
      description:
        randomDescriptions[
          Math.floor(Math.random() * randomDescriptions.length)
        ],
      imageUrl: `https://picsum.photos/600/400?random=${Math.random()}`,
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      releaseDate: "2025-01-01",
      version: "1.0." + Math.floor(Math.random() * 10),
      originalPrice: Math.floor(Math.random() * 500) + 50,
      discountPrice: Math.floor(Math.random() * 300),
      // ❌ XÓA: publisherId
    };
  };

  // ---------------------------------------------------------
  // 📝 INPUT CHANGE
  // ---------------------------------------------------------
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]:
        name === "originalPrice" || name === "discountPrice"
          ? Number(value)
          : value,
    }));
  };

  // ---------------------------------------------------------
  // 🚀 SUBMIT GAME
  // ---------------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (!token) {
      setMessage("❌ Bạn chưa đăng nhập — không có token.");
      setLoading(false);
      return;
    }

    if (form.discountPrice > form.originalPrice) {
      setMessage("❌ Giá giảm không được lớn hơn giá gốc.");
      setLoading(false);
      return;
    }

    try {
      console.log("📤 Sending game data:", form);
      console.log("🔑 Using token:", token.substring(0, 20) + "...");

      const res = await fetch(gameStoreApiUrl("/games"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // ✅ Backend tự lấy publisherId từ đây
        },
        body: JSON.stringify(form), // ✅ KHÔNG có publisherId
      });

      const responseData = await res.json();
      console.log("📥 Response:", responseData);

      if (!res.ok) {
        throw new Error(responseData.error?.message || "Failed to create game");
      }

      setMessage("🎉 Game đã được thêm thành công!");

      // ✅ Reset form
      setForm({
        name: "",
        genre: "",
        description: "",
        imageUrl: "",
        videoUrl: "",
        releaseDate: "",
        version: "",
        originalPrice: 0,
        discountPrice: 0,
      });

      // ✅ Redirect về trang game list sau 2s
      setTimeout(() => {
        router.push(`/publisher/game/${user.id}`);
      }, 2000);
    } catch (err) {
      console.error("❌ Error:", err);
      setMessage(
        "❌ Lỗi thêm game: " +
          (err instanceof Error ? err.message : "Unknown error")
      );
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------
  // UI
  // ---------------------------------------------------------
  return (
    <div className="max-w-3xl mx-auto mt-10 glass p-10 rounded-xl card-shadow">
      <h1 className="text-3xl font-bold mb-6">Thêm Game Mới</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Name + Genre */}
        <div className="grid grid-cols-2 gap-4">
          <input
            name="name"
            value={form.name}
            className="w-full bg-dark-200 px-4 py-2 rounded text-white"
            placeholder="Tên game"
            onChange={handleChange}
            required
          />

          <input
            name="genre"
            value={form.genre}
            className="w-full bg-dark-200 px-4 py-2 rounded text-white"
            placeholder="Thể loại (VD: Action, RPG)"
            onChange={handleChange}
            required
          />
        </div>

        {/* Description */}
        <textarea
          name="description"
          value={form.description}
          className="w-full bg-dark-200 px-4 py-2 rounded text-white"
          placeholder="Mô tả game"
          rows={3}
          onChange={handleChange}
          required
        />

        {/* Image + Video */}
        <div className="grid grid-cols-2 gap-4">
          <input
            name="imageUrl"
            value={form.imageUrl}
            className="w-full bg-dark-200 px-4 py-2 rounded text-white"
            placeholder="Image URL"
            onChange={handleChange}
            required
          />

          <input
            name="videoUrl"
            value={form.videoUrl}
            className="w-full bg-dark-200 px-4 py-2 rounded text-white"
            placeholder="Video URL (YouTube)"
            onChange={handleChange}
            required
          />
        </div>

        {/* Release date + Version */}
        <div className="grid grid-cols-2 gap-4">
          <input
            name="releaseDate"
            type="date"
            value={form.releaseDate}
            className="w-full bg-dark-200 px-4 py-2 rounded text-white"
            onChange={handleChange}
            required
          />

          <input
            name="version"
            value={form.version}
            className="w-full bg-dark-200 px-4 py-2 rounded text-white"
            placeholder="Version (VD: 1.0.0)"
            onChange={handleChange}
            required
          />
        </div>

        {/* ✅ ĐỔI: grid-cols-3 → grid-cols-2 (vì đã xóa Publisher ID) */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col">
            <label className="text-sm mb-1 text-gray-300">
              Giá gốc (VNĐ) *
            </label>
            <input
              name="originalPrice"
              type="number"
              value={form.originalPrice}
              className="w-full bg-dark-200 px-4 py-2 rounded text-white"
              placeholder="Nhập giá gốc"
              onChange={handleChange}
              required
              min="0"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm mb-1 text-gray-300">
              Giá giảm (VNĐ) *
            </label>
            <input
              name="discountPrice"
              type="number"
              value={form.discountPrice}
              className="w-full bg-dark-200 px-4 py-2 rounded text-white"
              placeholder="Nhập giá sau giảm"
              onChange={handleChange}
              required
              min="0"
            />
          </div>
        </div>

        {/* ❌ XÓA TOÀN BỘ phần Publisher ID input */}

        {/* Random Button */}
        <button
          type="button"
          onClick={() => setForm(randomGame())}
          className="w-full bg-blue-500 text-white font-semibold py-2 rounded-lg hover:bg-blue-600 transition"
        >
          🎲 Tạo Game Ngẫu Nhiên
        </button>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-black font-semibold py-3 rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
        >
          {loading ? "⏳ Đang thêm..." : "➕ Thêm Game"}
        </button>
      </form>

      {message && (
        <div
          className={`mt-4 p-4 rounded-lg text-center font-medium ${
            message.includes("thành công")
              ? "bg-green-500/20 border border-green-500 text-green-300"
              : "bg-red-500/20 border border-red-500 text-red-300"
          }`}
        >
          {message}
        </div>
      )}
    </div>
  );
}
