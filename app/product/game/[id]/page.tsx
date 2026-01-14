"use client";

import { useEffect, useMemo, useState } from "react";
import { TopBar } from "@/components/TopBar";
import { ProductActions } from "@/components/StoreActions";
import { ReportButton } from "@/components/ReportButton";
import { StarRating } from "@/components/StarRating";
import { useAuth } from "@/app/context/AuthContext";
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
  publisherId?: string;
  publisher?: { id?: string; publisherName?: string; email?: string };
};

type ReviewRow = {
  id: string;
  gameId: string;
  customerId?: string;
  reviewText: string;
  rating: number;
  createdAt?: string;
  updatedAt?: string;
  customer?: { id?: string; username?: string; email?: string };
};

function safeString(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function extractOrdersPayload(input: unknown) {
  if (Array.isArray(input)) return input;
  if (input && typeof input === "object" && Array.isArray((input as any).orders)) {
    return (input as any).orders as unknown[];
  }
  return [];
}

function orderIncludesGame(order: unknown, gameId: string) {
  if (!order || typeof order !== "object") return false;
  const record = order as any;

  const embeddedItems = Array.isArray(record.items) ? record.items : [];
  for (const item of embeddedItems) {
    const slug = safeString(item?.slug || item?.gameId || item?.game?.id);
    if (slug && slug === gameId) return true;
  }

  const details = Array.isArray(record.orderDetails) ? record.orderDetails : [];
  for (const detail of details) {
    const slug = safeString(detail?.gameId || detail?.game?.id);
    if (slug && slug === gameId) return true;
  }

  return false;
}

function hasCompletedPurchase(ordersPayload: unknown, gameId: string) {
  const orders = extractOrdersPayload(ordersPayload);
  for (const raw of orders) {
    if (!raw || typeof raw !== "object") continue;
    const status = safeString((raw as any)?.paymentStatus).toLowerCase();
    if (status !== "completed") continue;
    if (orderIncludesGame(raw, gameId)) return true;
  }
  return false;
}

export default function GameProductPage(props: { params: Promise<{ id: string }> }) {
  const { user, token } = useAuth();
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isCustomer = user?.accountType === "customer";

  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [reviewsSort, setReviewsSort] = useState<"date_desc" | "rating_desc" | "rating_asc">("date_desc");
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);

  const [myReview, setMyReview] = useState<ReviewRow | null>(null);
  const [reviewRating, setReviewRating] = useState("5");
  const [reviewText, setReviewText] = useState("");
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewMsg, setReviewMsg] = useState<string | null>(null);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseChecked, setPurchaseChecked] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

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

  const storeItem = useMemo(() => {
    if (!game) return null;
    const original = typeof game.originalPrice === "number" ? game.originalPrice : 0;
    const priceLabel = priceInfo?.label ?? `$${original.toFixed(2)}`;
    return {
      slug: game.id,
      name: game.name,
      image: game.imageUrl ?? "",
      priceLabel,
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

  useEffect(() => {
    if (!game?.id) return;
    let active = true;
    (async () => {
      setReviewsLoading(true);
      setReviewsError(null);
      try {
        const res = await fetch(gameStoreApiUrl(`/games/${game.id}/reviews?sort=${reviewsSort}`), { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.message || "Failed to load reviews");
        const list = Array.isArray(data?.reviews) ? (data.reviews as ReviewRow[]) : [];
        const computedAverage =
          list.length > 0
            ? list.reduce((sum, r) => sum + Math.max(1, Math.min(5, Math.floor(Number(r?.rating) || 0))), 0) /
              list.length
            : 0;
        if (!active) return;
        setReviews(list);
        setAverageRating(typeof data?.averageRating === "number" ? data.averageRating : computedAverage);
        setTotalReviews(typeof data?.totalReviews === "number" ? data.totalReviews : list.length);
      } catch (err) {
        if (!active) return;
        setReviews([]);
        setAverageRating(0);
        setTotalReviews(0);
        setReviewsError(err instanceof Error ? err.message : "Failed to load reviews");
      } finally {
        if (active) setReviewsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [game?.id, reviewsSort]);

  useEffect(() => {
    if (!token || !isCustomer || !game?.id) {
      setMyReview(null);
      setReviewMsg(null);
      return;
    }

    let active = true;
    (async () => {
      try {
        const res = await fetch(gameStoreApiUrl(`/customers/me/reviews?gameId=${encodeURIComponent(game.id)}`), {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) return;
        const first = Array.isArray(data) ? (data[0] as any) : null;
        if (!active) return;
        if (first?.id) {
          const next: ReviewRow = {
            id: String(first.id),
            gameId: String(first.gameId ?? game.id),
            customerId: String(first.customerId ?? ""),
            reviewText: String(first.reviewText ?? ""),
            rating: Number(first.rating) || 0,
            createdAt: first.createdAt,
            updatedAt: first.updatedAt,
          };
          setMyReview(next);
          setReviewRating(String(next.rating || 5));
          setReviewText(next.reviewText);
        } else {
          setMyReview(null);
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      active = false;
    };
  }, [game?.id, isCustomer, token]);

  useEffect(() => {
    if (!token || !isCustomer || !game?.id) {
      setPurchaseChecked(false);
      setPurchaseLoading(false);
      setHasPurchased(false);
      setPurchaseError(null);
      return;
    }

    let active = true;
    void (async () => {
      setPurchaseLoading(true);
      setPurchaseChecked(false);
      setPurchaseError(null);
      try {
        const res = await fetch(gameStoreApiUrl("/customers/me/orders"), {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          const msg =
            safeString((data as any)?.error?.message || (data as any)?.message) ||
            "Failed to verify purchase.";
          throw new Error(msg);
        }
        if (!active) return;
        setHasPurchased(hasCompletedPurchase(data, game.id));
        setPurchaseChecked(true);
      } catch (err) {
        if (!active) return;
        setHasPurchased(false);
        setPurchaseChecked(true);
        setPurchaseError(err instanceof Error ? err.message : "Failed to verify purchase.");
      } finally {
        if (active) setPurchaseLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [game?.id, isCustomer, token]);

  const publisherId = safeString(game?.publisherId) || safeString(game?.publisher?.id);
  const isOwnGame = Boolean(user?.id && publisherId && safeString(user.id) === publisherId);
  const canWriteReview = Boolean(
    token && isCustomer && !isOwnGame && (myReview?.id || (purchaseChecked && hasPurchased))
  );

  const saveMyReview = async () => {
    if (!token || !isCustomer || !game?.id) return;
    if (isOwnGame) {
      setReviewMsg("Publishers cannot review their own games.");
      return;
    }
    if (!myReview?.id && (purchaseLoading || !purchaseChecked)) {
      setReviewMsg("Checking purchase status. Please try again in a moment.");
      return;
    }
    if (!myReview?.id && !hasPurchased) {
      setReviewMsg("Only customers who have purchased this game can write a review.");
      return;
    }
    const rating = Math.max(1, Math.min(5, Math.floor(Number(reviewRating) || 0)));
    const text = reviewText.trim();
    if (!text) {
      setReviewMsg("Review text is required.");
      return;
    }
    if (text.length > 2000) {
      setReviewMsg("Review text is too long (max 2000).");
      return;
    }

    setReviewSaving(true);
    setReviewMsg(null);
    try {
      const existing = myReview?.id ? myReview : null;
      const url = existing
        ? gameStoreApiUrl(`/customers/me/reviews/${existing.id}`)
        : gameStoreApiUrl(`/customers/me/games/${game.id}/reviews`);
      const method = existing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ rating, reviewText: text }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        if (res.status === 403) {
          const msg = safeString((data as any)?.error?.message || (data as any)?.message);
          throw new Error(msg || "Only customers who have purchased this game can write a review.");
        }
        throw new Error(data?.message || "Failed to save review");
      }

      const next: ReviewRow = {
        id: String(data?.id ?? existing?.id ?? ""),
        gameId: String(data?.gameId ?? game.id),
        customerId: String(data?.customerId ?? ""),
        reviewText: text,
        rating,
        createdAt: data?.createdAt,
        updatedAt: data?.updatedAt ?? new Date().toISOString(),
      };
      setMyReview(next.id ? next : null);
      setReviewMsg("Saved.");
      // refresh public list
      const refresh = await fetch(gameStoreApiUrl(`/games/${game.id}/reviews?sort=${reviewsSort}`), { cache: "no-store" });
      const refreshed = await refresh.json().catch(() => null);
      if (refresh.ok) {
        const list: ReviewRow[] = Array.isArray(refreshed?.reviews) ? (refreshed.reviews as ReviewRow[]) : [];
        const computedAverage =
          list.length > 0
            ? list.reduce(
                (sum: number, r: ReviewRow) =>
                  sum + Math.max(1, Math.min(5, Math.floor(Number(r?.rating) || 0))),
                0
              ) /
              list.length
            : 0;
        setReviews(list);
        setAverageRating(typeof refreshed?.averageRating === "number" ? refreshed.averageRating : computedAverage);
        setTotalReviews(typeof refreshed?.totalReviews === "number" ? refreshed.totalReviews : list.length);
      }
    } catch (err) {
      setReviewMsg(err instanceof Error ? err.message : "Failed to save review");
    } finally {
      setReviewSaving(false);
    }
  };

  const deleteMyReview = async () => {
    if (!token || !isCustomer || !myReview?.id) return;
    if (!confirm("Delete your review?")) return;

    setReviewSaving(true);
    setReviewMsg(null);
    try {
      const res = await fetch(gameStoreApiUrl(`/customers/me/reviews/${myReview.id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Failed to delete review");
      }
      setMyReview(null);
      setReviewRating("5");
      setReviewText("");
      // refresh public list
      if (game?.id) {
        const refresh = await fetch(gameStoreApiUrl(`/games/${game.id}/reviews?sort=${reviewsSort}`), { cache: "no-store" });
        const refreshed = await refresh.json().catch(() => null);
        if (refresh.ok) {
          const list: ReviewRow[] = Array.isArray(refreshed?.reviews) ? (refreshed.reviews as ReviewRow[]) : [];
          const computedAverage =
            list.length > 0
              ? list.reduce(
                  (sum: number, r: ReviewRow) =>
                    sum + Math.max(1, Math.min(5, Math.floor(Number(r?.rating) || 0))),
                  0
                ) /
                list.length
              : 0;
          setReviews(list);
          setAverageRating(typeof refreshed?.averageRating === "number" ? refreshed.averageRating : computedAverage);
          setTotalReviews(typeof refreshed?.totalReviews === "number" ? refreshed.totalReviews : list.length);
        }
      }
    } catch (err) {
      setReviewMsg(err instanceof Error ? err.message : "Failed to delete review");
    } finally {
      setReviewSaving(false);
    }
  };

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
                <p className="text-sm text-white/70">
                  {totalReviews > 0 ? `${averageRating.toFixed(1)} / 5 (${totalReviews} reviews)` : "No ratings yet."}
                </p>
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
                {storeItem ? (
                  <div className="space-y-3">
                    <ProductActions item={storeItem} />
                    <div className="flex flex-wrap gap-3">
                      <ReportButton targetType="game" targetId={game.id} targetGameType="custom" label="Report game" />
                    </div>
                  </div>
                ) : null}
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

          <div className="mt-10 space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Reviews</h2>
                <p className="mt-1 text-sm text-white/70">
                  {totalReviews > 0 ? (
                    <>
                      <span className="font-semibold text-white">{averageRating.toFixed(1)}</span> / 5 (
                      {totalReviews} review{totalReviews === 1 ? "" : "s"})
                    </>
                  ) : (
                    "No reviews yet."
                  )}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-sm text-white/70">Sort</label>
                <select
                  value={reviewsSort}
                  onChange={(e) => setReviewsSort(e.target.value as any)}
                  className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white outline-none [color-scheme:dark]"
                >
                  <option value="date_desc">Newest</option>
                  <option value="rating_desc">Highest rating</option>
                  <option value="rating_asc">Lowest rating</option>
                </select>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <h3 className="text-lg font-semibold">Write a review</h3>
                {!token ? (
                  <p className="mt-2 text-sm text-white/70">Log in as a customer to review purchased games.</p>
                ) : !isCustomer ? (
                  <p className="mt-2 text-sm text-white/70">Only customer accounts can write reviews.</p>
                ) : isOwnGame ? (
                  <p className="mt-2 text-sm text-white/70">Publishers cannot review their own games.</p>
                ) : purchaseLoading && !myReview?.id ? (
                  <p className="mt-2 text-sm text-white/70">Checking purchase status...</p>
                ) : purchaseError && !myReview?.id ? (
                  <p className="mt-2 text-sm text-white/70">{purchaseError}</p>
                ) : purchaseChecked && !hasPurchased && !myReview?.id ? (
                  <p className="mt-2 text-sm text-white/70">Only purchased games can be reviewed.</p>
                ) : (
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="text-sm font-semibold text-white/80">Rating</label>
                      <StarRating
                        value={Math.max(1, Math.min(5, Math.floor(Number(reviewRating) || 5)))}
                        onChange={(next) => setReviewRating(String(next))}
                        disabled={reviewSaving || !canWriteReview}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-semibold text-white/80">Review</label>
                        <span className="text-xs text-white/60">{reviewText.trim().length}/2000</span>
                      </div>
                      <textarea
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        className="mt-2 h-28 w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
                        placeholder="Share your experience..."
                        maxLength={2000}
                        disabled={reviewSaving || !canWriteReview}
                      />
                    </div>

                    {reviewMsg ? (
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-white/80">
                        {reviewMsg}
                      </div>
                    ) : null}

                    <div className="flex flex-wrap justify-end gap-3">
                      {myReview?.id ? (
                        <button
                          type="button"
                          onClick={() => void deleteMyReview()}
                          disabled={reviewSaving}
                          className="rounded-full border border-red-400/50 bg-red-500/10 px-5 py-2 text-sm font-semibold text-red-100 hover:bg-red-500/20 disabled:opacity-60"
                        >
                          Delete
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => void saveMyReview()}
                        disabled={reviewSaving || !canWriteReview}
                        className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-[#1b1a55] hover:bg-white/90 disabled:opacity-60"
                      >
                        {reviewSaving ? "Saving..." : myReview?.id ? "Update review" : "Submit review"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {reviewsLoading ? (
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-white/70">
                    Loading reviews...
                  </div>
                ) : reviewsError ? (
                  <div className="rounded-3xl border border-red-500/40 bg-red-500/10 p-5 text-sm text-red-100">
                    {reviewsError}
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-white/70">
                    No reviews yet.
                  </div>
                ) : (
                  reviews.map((r) => (
                    <div key={r.id} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">
                            {r.customer?.username || r.customer?.email || "Customer"}
                          </p>
                          <p className="mt-1 text-xs text-white/60">
                            {Math.max(1, Math.min(5, Math.floor(Number(r.rating) || 0)))} / 5 -{" "}
                            {r.updatedAt ? new Date(r.updatedAt).toLocaleDateString() : "—"}
                          </p>
                        </div>
                        <ReportButton targetType="review" targetId={r.id} label="Report" compact />
                      </div>
                      <p className="mt-3 whitespace-pre-line text-sm text-white/80">{r.reviewText}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
