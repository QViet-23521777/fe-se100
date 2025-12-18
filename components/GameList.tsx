// components/GameList.tsx
"use client";
import { useEffect, useState } from "react";

interface Game {
  id: string;
  name: string;
  genre: string;
  description: string;
  imageUrl?: string;
  originalPrice: number;
  discountPrice?: number;
  releaseDate: string;
  publisher?: {
    name: string;
  };
}

export const GameList = ({ onSale = false }: { onSale?: boolean }) => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGames = async () => {
      try {
        setLoading(true);
        const url = onSale
          ? "http://localhost:3000/games?onSale=true"
          : "http://localhost:3000/games";

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error("Failed to fetch games");
        }

        const data = await response.json();
        setGames(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, [onSale]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-white/60">Loading games...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-red-400">Error: {error}</div>
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-white/60">No games found</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
      {games.map((game) => (
        <GameCard key={game.id} game={game} />
      ))}
    </div>
  );
};

const GameCard = ({ game }: { game: Game }) => {
  const hasDiscount =
    game.discountPrice && game.discountPrice < game.originalPrice;
  const discountPercent = hasDiscount
    ? Math.round(
        ((game.originalPrice - game.discountPrice!) / game.originalPrice) * 100
      )
    : 0;

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-cyan-400/50 transition-all group">
      {/* Image */}
      <div className="relative h-48 bg-white/5">
        {game.imageUrl ? (
          <img
            src={game.imageUrl}
            alt={game.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/40">
            No Image
          </div>
        )}

        {/* Discount Badge */}
        {hasDiscount && (
          <div className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded-lg font-bold">
            -{discountPercent}%
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">
          {game.name}
        </h3>

        <div className="flex items-center gap-2 text-sm text-white/60 mb-3">
          <span className="px-2 py-1 bg-white/5 rounded">{game.genre}</span>
          {game.publisher && (
            <span className="px-2 py-1 bg-white/5 rounded">
              {game.publisher.name}
            </span>
          )}
        </div>

        <p className="text-white/70 text-sm mb-4 line-clamp-2">
          {game.description}
        </p>

        {/* Price */}
        <div className="flex items-center gap-3">
          {hasDiscount ? (
            <>
              <span className="text-2xl font-bold text-cyan-400">
                ${game.discountPrice?.toFixed(2)}
              </span>
              <span className="text-lg text-white/40 line-through">
                ${game.originalPrice.toFixed(2)}
              </span>
            </>
          ) : (
            <span className="text-2xl font-bold text-white">
              ${game.originalPrice.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
