"use client";

import { useState } from "react";
import { useAuth } from "../../context/AuthContext";

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
  publisherId: string; // nếu backend yêu cầu number → đổi thành number
}

export default function CreateGamePage() {
  const { token } = useAuth();

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
    publisherId: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

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

      publisherId: String(Math.floor(Math.random() * 9000 + 1000)),
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
      const res = await fetch("http://localhost:3000/games", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error();

      setMessage("🎉 Game đã được thêm thành công!");
    } catch {
      setMessage("❌ Lỗi thêm game (Token sai hoặc API gặp lỗi).");
    }

    setLoading(false);
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
            className="w-full bg-dark-200 px-4 py-2 rounded"
            placeholder="Tên game"
            onChange={handleChange}
          />

          <input
            name="genre"
            value={form.genre}
            className="w-full bg-dark-200 px-4 py-2 rounded"
            placeholder="Thể loại"
            onChange={handleChange}
          />
        </div>

        {/* Description */}
        <textarea
          name="description"
          value={form.description}
          className="w-full bg-dark-200 px-4 py-2 rounded"
          placeholder="Mô tả"
          rows={3}
          onChange={handleChange}
        />

        {/* Image + Video */}
        <div className="grid grid-cols-2 gap-4">
          <input
            name="imageUrl"
            value={form.imageUrl}
            className="w-full bg-dark-200 px-4 py-2 rounded"
            placeholder="Image URL"
            onChange={handleChange}
          />

          <input
            name="videoUrl"
            value={form.videoUrl}
            className="w-full bg-dark-200 px-4 py-2 rounded"
            placeholder="Video URL"
            onChange={handleChange}
          />
        </div>

        {/* Release date + Version */}
        <div className="grid grid-cols-2 gap-4">
          <input
            name="releaseDate"
            type="date"
            value={form.releaseDate}
            className="w-full bg-dark-200 px-4 py-2 rounded"
            onChange={handleChange}
          />

          <input
            name="version"
            value={form.version}
            className="w-full bg-dark-200 px-4 py-2 rounded"
            placeholder="Version"
            onChange={handleChange}
          />
        </div>

        {/* Prices + Publisher */}
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col">
            <label className="text-sm mb-1 text-gray-300">Giá gốc (VNĐ)</label>
            <input
              name="originalPrice"
              type="number"
              value={form.originalPrice}
              className="w-full bg-dark-200 px-4 py-2 rounded"
              placeholder="Nhập giá gốc"
              onChange={handleChange}
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm mb-1 text-gray-300">Giá giảm (VNĐ)</label>
            <input
              name="discountPrice"
              type="number"
              value={form.discountPrice}
              className="w-full bg-dark-200 px-4 py-2 rounded"
              placeholder="Nhập giá sau giảm"
              onChange={handleChange}
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm mb-1 text-gray-300">Publisher ID</label>
            <input
              name="publisherId"
              value={form.publisherId}
              className="w-full bg-dark-200 px-4 py-2 rounded"
              placeholder="VD: PUB-1234"
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Random Button */}
        <button
          type="button"
          onClick={() => setForm(randomGame())}
          className="w-full bg-blue-500 text-white font-semibold py-2 rounded-lg hover:bg-blue-600"
        >
          🎲 Tạo Game Ngẫu Nhiên
        </button>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-black font-semibold py-3 rounded-lg hover:bg-primary/90"
        >
          {loading ? "Đang thêm..." : "Thêm Game"}
        </button>
      </form>

      {message && (
        <p className="text-center mt-4 text-sm font-medium">{message}</p>
      )}
    </div>
  );
}
