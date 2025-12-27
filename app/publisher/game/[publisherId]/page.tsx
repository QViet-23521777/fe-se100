"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { gameStoreApiUrl } from "@/lib/game-store-api";

type Game = {
  id: string;
  name: string;
  genre: string;
  description: string;
  imageUrl?: string;
  videoUrl?: string;
  releaseDate: string;
  publisherId: string;
  releaseStatus: string;
  version: string;
  originalPrice: number;
  discountPrice?: number;
  createdAt: string;
  updatedAt: string;
};

export default function PublisherGamesPage() {
  const params = useParams();
  const router = useRouter();
  const { user, token } = useAuth();

  const publisherId = params.publisherId as string;

  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);

  // ✅ Đánh dấu component đã mount
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!user || !token) {
      router.push("/publisher/login");
      return;
    }

    if (user.accountType !== "publisher") {
      alert("Please log in with a publisher account.");
      router.push("/publisher/login");
      return;
    }

    if (publisherId && publisherId !== user.id) {
      setError("You do not have access to this page.");
      router.push(`/publisher/game/${user.id}`);
    }
  }, [publisherId, router, token, user]);

  const fetchPublisherGames = async () => {
    if (!publisherId) return;

    setLoading(true);
    setError(null);

    try {
      const url = gameStoreApiUrl(
        `/games?publisherId=${encodeURIComponent(publisherId)}`
      );
      const res = await fetch(url);

      if (!res.ok) {
        throw new Error(`Failed to fetch games (${res.status})`);
      }

      const data = (await res.json()) as unknown;
      setGames(Array.isArray(data) ? (data as Game[]) : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch games");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!publisherId) return;
    fetchPublisherGames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publisherId]);

  const filteredGames = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return games;
    return games.filter(
      (game) =>
        game.name.toLowerCase().includes(q) ||
        game.genre.toLowerCase().includes(q) ||
        game.description.toLowerCase().includes(q)
    );
  }, [games, searchQuery]);

  const handleDeleteGame = async (gameId: string) => {
    if (!token) return;
    if (!confirm("Delete this game?")) return;

    setDeleteLoading(gameId);
    try {
      const res = await fetch(gameStoreApiUrl(`/games/${gameId}`), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to delete game");
      }

      await fetchPublisherGames();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete game");
    } finally {
      setDeleteLoading(null);
    }
  };

  // ✅ FIX: Chờ mount xong mới render để tránh hydration error
  if (!mounted) {
    return null;
  }

  // ✅ FIX: Loading state với consistent className
  if (!user || !token) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-white/70">Checking authentication…</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto mt-10 p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">
          Manage Games — {user.publisherName || user.name}
        </h1>
        <p className="text-white/60 text-sm">Publisher ID: {user.id}</p>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center">
        <button
          onClick={() => router.push(`/publisher/game/create`)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-lg transition flex items-center gap-2 whitespace-nowrap"
        >
          + Create game
        </button>

        <div className="flex-1 flex gap-2 w-full">
          <input
            type="text"
            placeholder="Search by name, genre, description…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-slate-800 border border-slate-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 transition"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="px-4 py-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-semibold transition"
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="bg-red-500/20 border border-red-500 text-red-200 p-4 rounded-lg mb-6">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="text-center py-20">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-4 text-white/60">Loading games…</p>
        </div>
      ) : null}

      {!loading && !error && games.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-xl text-white/70 mb-6">No games yet.</p>
          <button
            onClick={() => router.push(`/publisher/game/create`)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3 rounded-lg transition"
          >
            Create your first game
          </button>
        </div>
      ) : null}

      {!loading && !error && games.length > 0 ? (
        <>
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="text-white/60">
              Showing{" "}
              <span className="text-white font-semibold">
                {filteredGames.length}
              </span>{" "}
              of{" "}
              <span className="text-white font-semibold">{games.length}</span>
            </div>
          </div>

          {filteredGames.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-xl text-white/70">
                No games match "{searchQuery}".
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredGames.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  onDelete={handleDeleteGame}
                  isDeleting={deleteLoading === game.id}
                />
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

function GameCard({
  game,
  onDelete,
  isDeleting,
}: {
  game: Game;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const hasDiscount =
    typeof game.discountPrice === "number" &&
    game.discountPrice >= 0 &&
    game.discountPrice < game.originalPrice;
  const discountPercent =
    hasDiscount && game.originalPrice > 0
      ? Math.round(
          ((game.originalPrice - game.discountPrice!) / game.originalPrice) *
            100
        )
      : 0;

  return (
    <div className="bg-slate-800 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all border border-slate-700">
      <div className="relative h-48 bg-slate-900">
        {game.imageUrl ? (
          <img
            src={game.imageUrl}
            alt={game.name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.src =
                "https://via.placeholder.com/400x300?text=No+Image";
            }}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-white/50">
            No Image
          </div>
        )}

        {discountPercent > 0 ? (
          <div className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded-full font-bold text-sm">
            -{discountPercent}%
          </div>
        ) : null}

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

        <div className="flex items-center gap-2 mb-2 text-sm text-white/60">
          <span className="bg-slate-700 px-2 py-1 rounded">{game.genre}</span>
          <span>v{game.version}</span>
        </div>

        <p className="text-sm text-white/70 mb-4 line-clamp-2">
          {game.description}
        </p>

        <div className="flex items-center gap-2 mb-4">
          {hasDiscount ? (
            <>
              <span className="text-white/50 line-through text-sm">
                ${game.originalPrice.toFixed(2)}
              </span>
              <span className="text-blue-300 font-bold text-lg">
                ${game.discountPrice!.toFixed(2)}
              </span>
            </>
          ) : (
            <span className="text-blue-300 font-bold text-lg">
              ${game.originalPrice.toFixed(2)}
            </span>
          )}
        </div>

        <div className="text-xs text-white/50 space-y-1 mb-4">
          <div>Release: {new Date(game.releaseDate).toLocaleDateString()}</div>
          <div>Updated: {new Date(game.updatedAt).toLocaleDateString()}</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onDelete(game.id)}
            disabled={isDeleting}
            className="col-span-2 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-bold transition disabled:opacity-50"
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </button>
        </div>

        {game.videoUrl ? (
          <a
            href={game.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block w-full bg-slate-700 hover:bg-slate-600 text-center py-2 rounded-lg text-sm font-bold transition text-white"
          >
            Watch trailer
          </a>
        ) : null}
      </div>
    </div>
  );
}
