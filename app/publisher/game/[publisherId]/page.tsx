"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";

interface Game {
  id: string;
  name: string;
  genre: string;
  description: string;
  imageUrl: string;
  videoUrl: string;
  releaseDate: string;
  publisherId: string;
  releaseStatus: string;
  version: string;
  originalPrice: number;
  discountPrice: number;
  createdAt: string;
  updatedAt: string;
}

export default function PublisherGamesPage() {
  const params = useParams();
  const router = useRouter();
  const { user, token } = useAuth();

  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isClient, setIsClient] = useState(false);

  const publisherId = params.publisherId as string;

  // Fix hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Check authentication
  useEffect(() => {
    if (!isClient) return;

    if (!user || !token) {
      console.warn("❌ Chưa đăng nhập, redirect to login...");
      router.push("/publisher/login");
      return;
    }

    if (user.accountType !== "publisher") {
      console.warn("❌ Không phải publisher, redirect to login...");
      alert("Bạn cần đăng nhập bằng tài khoản Publisher!");
      router.push("/publisher/login");
      return;
    }

    if (publisherId && publisherId !== user.id) {
      console.error(
        "❌ Publisher ID không khớp! URL:",
        publisherId,
        "User:",
        user.id
      );
      setError("❌ Không có quyền truy cập trang này");
      setTimeout(() => {
        router.push(`/publisher/game/${user.id}`);
      }, 2000);
    }
  }, [isClient, user, token, publisherId, router]);

  // Fetch games
  useEffect(() => {
    const fetchPublisherGames = async () => {
      if (!publisherId || !token) return;

      setLoading(true);
      setError("");

      try {
        const res = await fetch(
          `http://localhost:3000/games?filter=${encodeURIComponent(
            JSON.stringify({ where: { publisherId } })
          )}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        const data = await res.json();
        console.log("✅ Fetched games:", data);
        setGames(Array.isArray(data) ? data : []);
      } catch (err) {
        setError("❌ Không thể tải danh sách game");
        console.error("Fetch games error:", err);
      } finally {
        setLoading(false);
      }
    };

    if (isClient && publisherId && user?.id && token) {
      console.log("🔄 Fetching games for publisher:", publisherId);
      fetchPublisherGames();
    }
  }, [isClient, publisherId, user?.id, token]);

  // Delete game
  const handleDeleteGame = async (gameId: string) => {
    if (!confirm("Bạn có chắc muốn xóa game này?")) return;

    setDeleteLoading(gameId);
    try {
      const res = await fetch(`http://localhost:3000/games/${gameId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to delete game");

      // Refresh list
      setGames(games.filter((g) => g.id !== gameId));
      alert("✅ Xóa game thành công!");
    } catch (err) {
      console.error(err);
      alert("❌ Không thể xóa game!");
    } finally {
      setDeleteLoading(null);
    }
  };

  if (!isClient || !user || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
          <p className="text-gray-400">Đang kiểm tra xác thực...</p>
        </div>
      </div>
    );
  }

  const filteredGames = games.filter(
    (game) =>
      game.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.genre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto mt-10 p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">
          Quản lý Game - {user.publisherName || user.name}
        </h1>
        <p className="text-gray-400">Publisher ID: {user.id}</p>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center">
        <button
          onClick={() => router.push(`/publisher/game/create`)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-lg transition flex items-center gap-2 whitespace-nowrap"
        >
          ➕ Tạo Game Mới
        </button>

        <div className="flex-1 flex gap-2 w-full">
          <input
            type="text"
            placeholder="Tìm kiếm game theo tên, thể loại..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-slate-800 border border-slate-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 transition"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-300 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-center py-20">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-400">Đang tải game...</p>
        </div>
      )}

      {!loading && games.length === 0 && !error && (
        <div className="text-center py-20">
          <p className="text-6xl mb-4">🎮</p>
          <p className="text-xl text-gray-400 mb-6">Bạn chưa có game nào</p>
          <button
            onClick={() => router.push(`/publisher/create`)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3 rounded-lg transition"
          >
            ➕ Thêm Game Đầu Tiên
          </button>
        </div>
      )}

      {!loading && games.length > 0 && (
        <>
          <div className="mb-4 flex justify-between items-center">
            <div className="text-gray-400">
              {searchQuery ? (
                <>
                  Tìm thấy:{" "}
                  <span className="text-blue-500 font-bold">
                    {filteredGames.length}
                  </span>{" "}
                  / {games.length} game
                </>
              ) : (
                <>
                  Tổng cộng:{" "}
                  <span className="text-blue-500 font-bold">
                    {games.length}
                  </span>{" "}
                  game
                </>
              )}
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-sm text-gray-400 hover:text-white transition"
              >
                ✕ Xóa bộ lọc
              </button>
            )}
          </div>

          {filteredGames.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-6xl mb-4">🔍</p>
              <p className="text-xl text-gray-400 mb-6">
                Không tìm thấy game nào với từ khóa &quot;{searchQuery}&quot;
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredGames.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  onDelete={handleDeleteGame}
                  onEdit={(id) => router.push(`/publisher/game/edit/${id}`)}
                  isDeleting={deleteLoading === game.id}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function GameCard({
  game,
  onDelete,
  onEdit,
  isDeleting,
}: {
  game: Game;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  isDeleting: boolean;
}) {
  const discountPercent =
    game.originalPrice > 0
      ? Math.round(
          ((game.originalPrice - game.discountPrice) / game.originalPrice) * 100
        )
      : 0;

  return (
    <div className="bg-slate-800 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl hover:scale-105 transition-all border border-slate-700">
      <div className="relative h-48 bg-slate-900">
        <img
          src={game.imageUrl}
          alt={game.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = "https://via.placeholder.com/400x300?text=No+Image";
          }}
        />

        {discountPercent > 0 && (
          <div className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded-full font-bold text-sm">
            -{discountPercent}%
          </div>
        )}

        <div
          className={`absolute top-2 left-2 px-3 py-1 rounded-full text-xs font-bold ${
            game.releaseStatus === "Released"
              ? "bg-green-500 text-white"
              : "bg-yellow-500 text-black"
          }`}
        >
          {game.releaseStatus}
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-xl font-bold mb-2 truncate text-white">
          {game.name}
        </h3>

        <div className="flex items-center gap-2 mb-2 text-sm text-gray-400">
          <span className="bg-slate-700 px-2 py-1 rounded">{game.genre}</span>
          <span>v{game.version}</span>
        </div>

        <p className="text-sm text-gray-300 mb-4 line-clamp-2">
          {game.description}
        </p>

        <div className="flex items-center gap-2 mb-4">
          {game.discountPrice < game.originalPrice ? (
            <>
              <span className="text-gray-500 line-through text-sm">
                {game.originalPrice.toLocaleString()}đ
              </span>
              <span className="text-blue-400 font-bold text-lg">
                {game.discountPrice.toLocaleString()}đ
              </span>
            </>
          ) : (
            <span className="text-blue-400 font-bold text-lg">
              {game.originalPrice.toLocaleString()}đ
            </span>
          )}
        </div>

        <div className="text-xs text-gray-500 space-y-1 mb-4">
          <div>
            📅 Phát hành:{" "}
            {new Date(game.releaseDate).toLocaleDateString("vi-VN")}
          </div>
          <div>
            🕒 Cập nhật: {new Date(game.updatedAt).toLocaleDateString("vi-VN")}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onEdit(game.id)}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-bold transition"
          >
            ✏️ Sửa
          </button>
          <button
            onClick={() => onDelete(game.id)}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-bold transition disabled:opacity-50"
          >
            {isDeleting ? "⏳" : "🗑️ Xóa"}
          </button>
        </div>

        {game.videoUrl && (
          <a
            href={game.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block w-full bg-slate-700 hover:bg-slate-600 text-center py-2 rounded-lg text-sm font-bold transition text-white"
          >
            🎬 Xem Trailer
          </a>
        )}
      </div>
    </div>
  );
}
