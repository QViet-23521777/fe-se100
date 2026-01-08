"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { gameStoreApiUrl } from "@/lib/game-store-api";

type Game = {
  id: string;
  name: string;
  genre?: string;
  description?: string;
  imageUrl?: string;
  videoUrl?: string;
  releaseDate?: string;
  version?: string;
  originalPrice?: number;
  discountPrice?: number;
  steamAppId?: number;
};

export default function GameProductPage(props: { params: Promise<{ id: string }> }) {
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const router = useRouter();
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const priceInfo = useMemo(() => {
    if (!game) return null;
    const original = typeof game.originalPrice === "number" ? game.originalPrice : 0;
    const discounted =
      typeof game.discountPrice === "number" && game.discountPrice > 0 ? game.discountPrice : original;
    const hasDiscount = discounted < original && discounted > 0;
    return {
      label: `$${discounted.toFixed(2)}`,
      originalLabel: hasDiscount ? `$${original.toFixed(2)}` : null,
      hasDiscount,
    };
  }, [game]);

  useEffect(() => {
    props.params.then((p) => setResolvedParams(p)).catch(() => setResolvedParams(null));
  }, [props.params]);

  useEffect(() => {
    if (!resolvedParams?.id) return;
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(gameStoreApiUrl(`/games/${resolvedParams.id}`), {
          cache: "no-store",
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data) {
          throw new Error(data?.message || "Game not found");
        }
        if (!active) return;
        setGame(data);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load game");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [resolvedParams?.id]);

  if (!resolvedParams?.id) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070f2b] text-white -mx-5 sm:-mx-10">
        <div className="flex w-full flex-col gap-8 px-5 pb-16 pt-6 sm:px-8 lg:px-10">
          <TopBar />
          <p className="text-white/70">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="min-h-screen bg-[#070f2b] text-white -mx-5 sm:-mx-10">
        <div className="flex w-full flex-col gap-8 px-5 pb-16 pt-6 sm:px-8 lg:px-10">
          <TopBar />
          <div className="rounded-3xl border border-red-500/40 bg-red-500/10 p-6 text-red-100">
            {error || "Game not found"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070f2b] text-white -mx-5 sm:-mx-10">
      <div className="flex w-full flex-col gap-8 px-5 pb-16 pt-6 sm:px-8 lg:px-10">
        <TopBar />

        <div className="rounded-[28px] border border-white/10 bg-gradient-to-b from-white/10 to-black/25 p-6 shadow-2xl backdrop-blur">
          <div className="grid gap-8 lg:grid-cols-[1.25fr_1fr]">
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/30">
              {game.imageUrl ? (
                <img
                  src={game.imageUrl}
                  alt={game.name}
                  className="h-[400px] w-full object-cover"
                />
              ) : (
                <div className="flex h-[400px] items-center justify-center text-white/60">No image</div>
              )}
            </div>

            <div className="flex flex-col gap-4">
              <div className="space-y-2">
                <h1 className="text-4xl font-semibold leading-tight">{game.name}</h1>
                <p className="text-2xl font-semibold">
                  {priceInfo?.label}
                  {priceInfo?.originalLabel ? (
                    <span className="ml-2 align-middle text-base text-white/60 line-through">{priceInfo.originalLabel}</span>
                  ) : null}
                </p>
                <p className="text-white/75">
                  {game.description || "No description available for this title yet."}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {game.steamAppId ? (
                  <span className="rounded-full bg-white/10 px-4 py-1 text-xs font-semibold text-white/80">
                    AppID {game.steamAppId}
                  </span>
                ) : null}
                {game.genre ? (
                  <span className="rounded-full bg-white/10 px-4 py-1 text-xs font-semibold text-white/80">
                    {game.genre}
                  </span>
                ) : null}
                {game.version ? (
                  <span className="rounded-full bg-white/10 px-4 py-1 text-xs font-semibold text-white/80">
                    v{game.version}
                  </span>
                ) : null}
                {game.releaseDate ? (
                  <span className="rounded-full bg-white/10 px-4 py-1 text-xs font-semibold text-white/80">
                    Release: {new Date(game.releaseDate).toLocaleDateString()}
                  </span>
                ) : null}
              </div>

              <div className="flex flex-col gap-3">
                <button className="w-full rounded-full bg-white px-4 py-3 text-center text-sm font-semibold text-[#1b1a55]">
                  Buy Now
                </button>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button className="flex-1 rounded-full bg-[#1b1a55] px-4 py-3 text-sm font-semibold text-white">
                    Add to Cart
                  </button>
                  <button className="flex-1 rounded-full border border-white/40 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10">
                    Add to Wishlist
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <h2 className="text-xl font-semibold">About the game</h2>
              <p className="text-white/75 whitespace-pre-line">
                {game.description || "No description available."}
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <h2 className="text-xl font-semibold mb-3">Details</h2>
              <div className="space-y-2 text-sm text-white/80">
                <div className="flex justify-between">
                  <span>Genre</span>
                  <span>{game.genre || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Version</span>
                  <span>{game.version || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Release Date</span>
                  <span>
                    {game.releaseDate
                      ? new Date(game.releaseDate).toLocaleDateString()
                      : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
