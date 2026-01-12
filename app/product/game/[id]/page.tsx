"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { ProductActions } from "@/components/StoreActions";
import { useAuth } from "@/app/context/AuthContext";
import type { StoreItemInput } from "@/app/context/StoreContext";
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

type Review = {
  id: string;
  rating: number;
  reviewText: string;
  createdAt?: string;
  updatedAt?: string;
  customer?: { id?: string; name?: string; email?: string };
};

function Stars({ value }: { value: number }) {
  const filled = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <div className="flex items-center gap-1" aria-label={`${filled} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, idx) => {
        const active = idx < filled;
        return (
          <svg
            key={idx}
            viewBox="0 0 24 24"
            className={`h-4 w-4 ${active ? "text-yellow-300" : "text-white/20"}`}
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 17.3l-6.2 3.6 1.6-7.1-5.5-4.8 7.2-.6L12 2l2.9 6.4 7.2.6-5.5 4.8 1.6 7.1z" />
          </svg>
        );
      })}
    </div>
  );
}

export default function GameProductPage(props: { params: Promise<{ id: string }> }) {
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const router = useRouter();
  const { token, user } = useAuth();

  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [totalReviews, setTotalReviews] = useState<number>(0);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  const [myReview, setMyReview] = useState<Review | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewText, setReviewText] = useState<string>("");
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  const priceInfo = useMemo(() => {
    if (!game) return null;
    const original = typeof game.originalPrice === "number" ? game.originalPrice : 0;
    const discounted =
      typeof game.discountPrice === "number" && game.discountPrice > 0
        ? game.discountPrice
        : original;
    const hasDiscount = discounted < original && discounted > 0;
    return {
      label: `$${discounted.toFixed(2)}`,
      originalLabel: hasDiscount ? `$${original.toFixed(2)}` : null,
      hasDiscount,
    };
  }, [game]);

  const storeItem = useMemo<StoreItemInput | null>(() => {
    if (!game) return null;
    return {
      slug: game.id,
      name: game.name,
      image: game.imageUrl || "",
      priceLabel: priceInfo?.label ?? null,
      originalPriceLabel: priceInfo?.originalLabel ?? null,
    };
  }, [game, priceInfo?.label, priceInfo?.originalLabel]);

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

  async function refreshReviews() {
    if (!resolvedParams?.id) return;
    const res = await fetch(gameStoreApiUrl(`/games/${resolvedParams.id}/reviews`), {
      cache: "no-store",
    });
    const data = await res.json().catch(() => null);
    const list = Array.isArray(data?.reviews) ? (data.reviews as Review[]) : [];
    setReviews(list);
    setAverageRating(typeof data?.averageRating === "number" ? data.averageRating : 0);
    setTotalReviews(typeof data?.totalReviews === "number" ? data.totalReviews : list.length);
  }

  useEffect(() => {
    if (!resolvedParams?.id) return;
    let active = true;
    (async () => {
      setReviewsLoading(true);
      setReviewsError(null);
      try {
        const res = await fetch(gameStoreApiUrl(`/games/${resolvedParams.id}/reviews`), {
          cache: "no-store",
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data) {
          throw new Error(data?.message || "Failed to load reviews");
        }
        if (!active) return;
        const list = Array.isArray(data.reviews) ? (data.reviews as Review[]) : [];
        setReviews(list);
        setAverageRating(typeof data.averageRating === "number" ? data.averageRating : 0);
        setTotalReviews(typeof data.totalReviews === "number" ? data.totalReviews : list.length);
      } catch (err) {
        if (!active) return;
        setReviewsError(err instanceof Error ? err.message : "Failed to load reviews");
      } finally {
        if (active) setReviewsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [resolvedParams?.id]);

  async function refreshMyReview() {
    if (!resolvedParams?.id) return;
    if (!token || user?.accountType !== "customer") return;
    const res = await fetch(
      gameStoreApiUrl(`/customers/me/reviews?gameId=${encodeURIComponent(resolvedParams.id)}`),
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
    );
    const data = await res.json().catch(() => null);
    const first = Array.isArray(data) && data.length > 0 ? (data[0] as Review) : null;
    setMyReview(first);
  }

  useEffect(() => {
    if (!resolvedParams?.id) return;
    if (!token || user?.accountType !== "customer") {
      setMyReview(null);
      setReviewMessage(null);
      setReviewRating(5);
      setReviewText("");
      return;
    }
    let active = true;
    (async () => {
      try {
        const res = await fetch(
          gameStoreApiUrl(`/customers/me/reviews?gameId=${encodeURIComponent(resolvedParams.id)}`),
          { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
        );
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.message || "Failed to load your review");
        const first = Array.isArray(data) && data.length > 0 ? (data[0] as Review) : null;
        if (!active) return;
        setMyReview(first);
        setReviewRating(first?.rating ?? 5);
        setReviewText(first?.reviewText ?? "");
      } catch {
        if (!active) return;
        setMyReview(null);
      }
    })();
    return () => {
      active = false;
    };
  }, [resolvedParams?.id, token, user?.accountType]);

  if (!resolvedParams?.id) return null;

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
                <img src={game.imageUrl} alt={game.name} className="h-[400px] w-full object-cover" />
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
                    <span className="ml-2 align-middle text-base text-white/60 line-through">
                      {priceInfo.originalLabel}
                    </span>
                  ) : null}
                </p>
                <p className="text-white/75">{game.description || "No description available for this title yet."}</p>
                <div className="flex items-center gap-3 pt-1">
                  <Stars value={averageRating} />
                  <span className="text-sm text-white/70">
                    {totalReviews === 0
                      ? "No reviews yet"
                      : `${averageRating.toFixed(1)} · ${totalReviews} review${totalReviews === 1 ? "" : "s"}`}
                  </span>
                </div>
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

              {storeItem ? <ProductActions item={storeItem} /> : null}
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <h2 className="text-xl font-semibold">About the game</h2>
              <p className="text-white/75 whitespace-pre-line">{game.description || "No description available."}</p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <h2 className="mb-3 text-xl font-semibold">Details</h2>
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
                  <span>{game.releaseDate ? new Date(game.releaseDate).toLocaleDateString() : "—"}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Reviews</h2>
                <p className="text-sm text-white/70">
                  {totalReviews === 0 ? "Be the first to review this game." : "What players are saying."}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Stars value={averageRating} />
                <span className="text-sm text-white/70">{averageRating.toFixed(1)} / 5</span>
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <h3 className="text-base font-semibold">
                  {user?.accountType === "customer"
                    ? myReview
                      ? "Edit your review"
                      : "Write a review"
                    : "Log in to review"}
                </h3>
                <p className="mt-1 text-sm text-white/70">
                  {user?.accountType === "customer"
                    ? "You can leave one review per purchased game."
                    : "Only customers can post reviews."}
                </p>

                {reviewMessage ? (
                  <div
                    className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
                      reviewMessage.type === "success"
                        ? "border-green-500/40 bg-green-500/10 text-green-200"
                        : "border-red-500/40 bg-red-500/10 text-red-200"
                    }`}
                  >
                    {reviewMessage.text}
                  </div>
                ) : null}

                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="text-sm text-white/70">Your rating</span>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, idx) => {
                      const value = idx + 1;
                      const active = value <= reviewRating;
                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={!token || user?.accountType !== "customer"}
                          onClick={() => setReviewRating(value)}
                          className="p-1 disabled:cursor-not-allowed"
                          aria-label={`${value} star`}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            className={`h-6 w-6 ${active ? "text-yellow-300" : "text-white/20"}`}
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <path d="M12 17.3l-6.2 3.6 1.6-7.1-5.5-4.8 7.2-.6L12 2l2.9 6.4 7.2.6-5.5 4.8 1.6 7.1z" />
                          </svg>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4">
                  <textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    disabled={!token || user?.accountType !== "customer"}
                    placeholder="Share what you liked (or didn't)..."
                    rows={5}
                    className="w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30 disabled:opacity-60"
                  />
                  <div className="mt-2 flex items-center justify-between text-xs text-white/50">
                    <span>{reviewText.trim().length === 0 ? "Review text is required." : " "}</span>
                    <span>{Math.min(2000, reviewText.length)} / 2000</span>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    disabled={!token || user?.accountType !== "customer" || reviewSaving}
                    onClick={async () => {
                      if (!token || user?.accountType !== "customer") {
                        router.push(
                          `/user/login?next=${encodeURIComponent(`/product/game/${resolvedParams.id}`)}`
                        );
                        return;
                      }

                      setReviewSaving(true);
                      setReviewMessage(null);
                      try {
                        const payload = {
                          rating: reviewRating,
                          reviewText: reviewText.trim(),
                        };
                        const url = myReview?.id
                          ? gameStoreApiUrl(`/customers/me/reviews/${encodeURIComponent(myReview.id)}`)
                          : gameStoreApiUrl(
                              `/customers/me/games/${encodeURIComponent(resolvedParams.id)}/reviews`
                            );
                        const method = myReview?.id ? "PATCH" : "POST";
                        const res = await fetch(url, {
                          method,
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                          },
                          body: JSON.stringify(payload),
                        });
                        const data = await res.json().catch(() => null);
                        if (!res.ok) {
                          throw new Error(
                            data?.error?.message || data?.message || "Failed to save review."
                          );
                        }

                        setReviewMessage({
                          type: "success",
                          text: myReview?.id ? "Review updated." : "Review posted.",
                        });
                        await Promise.all([refreshReviews(), refreshMyReview()]);
                      } catch (err) {
                        setReviewMessage({
                          type: "error",
                          text: err instanceof Error ? err.message : "Failed to save review.",
                        });
                      } finally {
                        setReviewSaving(false);
                      }
                    }}
                    className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-[#1b1a55] disabled:opacity-60"
                  >
                    {reviewSaving ? "Saving..." : myReview?.id ? "Update Review" : "Submit Review"}
                  </button>

                  {myReview?.id ? (
                    <button
                      type="button"
                      disabled={!token || user?.accountType !== "customer" || reviewSaving}
                      onClick={async () => {
                        setReviewSaving(true);
                        setReviewMessage(null);
                        try {
                          const res = await fetch(
                            gameStoreApiUrl(`/customers/me/reviews/${encodeURIComponent(myReview.id)}`),
                            {
                              method: "DELETE",
                              headers: { Authorization: `Bearer ${token}` },
                            }
                          );
                          if (!res.ok) {
                            const data = await res.json().catch(() => null);
                            throw new Error(
                              data?.error?.message || data?.message || "Failed to delete review."
                            );
                          }

                          setMyReview(null);
                          setReviewRating(5);
                          setReviewText("");
                          setReviewMessage({ type: "success", text: "Review removed." });
                          await refreshReviews();
                        } catch (err) {
                          setReviewMessage({
                            type: "error",
                            text: err instanceof Error ? err.message : "Failed to delete review.",
                          });
                        } finally {
                          setReviewSaving(false);
                        }
                      }}
                      className="rounded-full border border-white/20 bg-white/5 px-5 py-2 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-60"
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                {reviewsLoading ? (
                  <p className="text-sm text-white/70">Loading reviews…</p>
                ) : reviewsError ? (
                  <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
                    {reviewsError}
                  </div>
                ) : reviews.length === 0 ? (
                  <p className="text-sm text-white/70">No reviews yet.</p>
                ) : (
                  <div className="space-y-4">
                    {reviews.slice(0, 25).map((r) => (
                      <div key={r.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {r.customer?.name || r.customer?.email || "Customer"}
                            </p>
                            <div className="mt-1 flex items-center gap-2 text-xs text-white/60">
                              <Stars value={r.rating} />
                              <span>
                                {r.updatedAt || r.createdAt
                                  ? new Date((r.updatedAt || r.createdAt) as any).toLocaleDateString()
                                  : ""}
                              </span>
                            </div>
                          </div>
                        </div>
                        <p className="mt-3 whitespace-pre-line text-sm text-white/80">{r.reviewText}</p>
                      </div>
                    ))}
                    {reviews.length > 25 ? (
                      <p className="text-xs text-white/50">Showing the latest 25 reviews.</p>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
