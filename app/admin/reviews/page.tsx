"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/app/context/AuthContext";
import { gameStoreApiUrl } from "@/lib/game-store-api";

type Message = { type: "error" | "success"; text: string } | null;

type SidebarLink = { key: string; title: string; subtitle: string; href: string };

type Review = {
  id: string;
  rating: number;
  reviewText: string;
  createdAt?: string;
  updatedAt?: string;
  customer?: { id?: string; name?: string; email?: string };
  game?: { id?: string; name?: string; genre?: string };
};

type PublisherGame = { id: string; name: string };

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

function StarPicker({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  const current = Math.max(1, Math.min(5, Math.round(value || 1)));
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, idx) => {
        const v = idx + 1;
        const active = v <= current;
        return (
          <button
            key={idx}
            type="button"
            disabled={disabled}
            onClick={() => onChange(v)}
            className="p-1 disabled:cursor-not-allowed"
            aria-label={`${v} star`}
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
  );
}

function SidebarItem({ item, active }: { item: SidebarLink; active?: boolean }) {
  return (
    <Link
      href={item.href}
      className={`block px-6 py-5 transition ${active ? "bg-white/10" : "hover:bg-white/5"}`}
    >
      <p className="text-lg font-semibold text-white">{item.title}</p>
      <p className="mt-1 text-sm text-white/55">{item.subtitle}</p>
    </Link>
  );
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

export default function ReviewsManagementPage() {
  const router = useRouter();
  const { user, token } = useAuth();

  const isAdmin = user?.accountType === "admin";
  const isPublisher = user?.accountType === "publisher";

  const [games, setGames] = useState<PublisherGame[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<Message>(null);

  const [query, setQuery] = useState("");
  const [gameId, setGameId] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState<number>(5);
  const [editText, setEditText] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [editMsg, setEditMsg] = useState<Message>(null);

  useEffect(() => {
    if (!token || (!isAdmin && !isPublisher)) {
      router.replace(`/user/login?next=${encodeURIComponent("/user/manage-reviews")}`);
    }
  }, [isAdmin, isPublisher, router, token]);

  const sidebarLinks: SidebarLink[] = useMemo(() => {
    if (isAdmin) {
      return [
        { key: "personal", title: "Personal Information", subtitle: "Modify your personal information", href: "/user/profile" },
        { key: "manage-accounts", title: "Manage Accounts", subtitle: "Create or edit admin/publisher accounts", href: "/user/manage-accounts" },
        { key: "manage-games", title: "Manage Games", subtitle: "Create or edit games", href: "/user/manage-games" },
        { key: "manage-promos", title: "Manage Promo Codes", subtitle: "Create and manage promotions", href: "/user/manage-promos" },
        { key: "manage-orders", title: "Manage Orders", subtitle: "View customer purchases", href: "/user/manage-orders" },
        { key: "manage-refunds", title: "Manage Refunds", subtitle: "Review and process refunds", href: "/user/manage-refunds" },
        { key: "manage-reviews", title: "Manage Reviews", subtitle: "Moderate customer reviews", href: "/user/manage-reviews" },
      ];
    }
    return [
      { key: "personal", title: "Personal Information", subtitle: "Modify your personal information", href: "/user/profile" },
      { key: "manage-games", title: "Manage Games", subtitle: "Create or edit games", href: "/user/manage-games" },
      { key: "manage-promos", title: "Manage Promo Codes", subtitle: "Create and manage promotions", href: "/user/manage-promos" },
      { key: "manage-reviews", title: "Manage Reviews", subtitle: "View reviews for your games", href: "/user/manage-reviews" },
    ];
  }, [isAdmin]);

  const canEdit = isAdmin;

  async function loadGames() {
    if (!token) return;
    if (!isPublisher && !isAdmin) return;
    try {
      const res = await fetch(gameStoreApiUrl("/publisher/games/me"), {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) return;
      const list = Array.isArray(data) ? (data as PublisherGame[]) : [];
      setGames(list.map((g) => ({ id: String(g.id), name: String((g as any).name ?? "") })));
    } catch {}
  }

  async function loadReviews() {
    if (!token) return;
    setLoading(true);
    setMsg(null);
    try {
      const url = isAdmin ? "/admin/reviews" : `/publisher/reviews${gameId ? `?gameId=${encodeURIComponent(gameId)}` : ""}`;
      const res = await fetch(gameStoreApiUrl(url), {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || `Failed to load reviews (HTTP ${res.status}).`);
      }
      const list = Array.isArray(data) ? (data as Review[]) : [];
      setReviews(list);
    } catch (err) {
      setMsg({ type: "error", text: err instanceof Error ? err.message : "Failed to load reviews." });
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token || (!isAdmin && !isPublisher)) return;
    loadGames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isAdmin, isPublisher]);

  useEffect(() => {
    if (!token || (!isAdmin && !isPublisher)) return;
    loadReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isAdmin, isPublisher, gameId]);

  const filtered = useMemo(() => {
    const q = normalizeText(query);
    if (!q) return reviews;
    return reviews.filter((r) => {
      const hay = normalizeText(
        [
          r.game?.name,
          r.customer?.name,
          r.customer?.email,
          r.reviewText,
          String(r.rating ?? ""),
        ]
          .filter(Boolean)
          .join(" ")
      );
      return hay.includes(q);
    });
  }, [query, reviews]);

  const summary = useMemo(() => {
    if (filtered.length === 0) return { avg: 0, count: 0 };
    const sum = filtered.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
    return { avg: sum / filtered.length, count: filtered.length };
  }, [filtered]);

  return (
    <div className="min-h-screen w-full bg-[#070f2b] text-white -mx-5 sm:-mx-10">
      <div className="flex w-full flex-col gap-10 px-5 pb-16 pt-6 sm:px-8 lg:px-10">
        <TopBar />

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <aside className="w-full overflow-hidden rounded-[24px] border border-white/10 bg-white/5 backdrop-blur-xl lg:max-w-[360px]">
            <div className="px-6 py-6">
              <p className="text-2xl font-semibold">My Account</p>
              <p className="mt-1 text-sm text-white/60">Account Management</p>
            </div>
            <div className="divide-y divide-white/10">
              {sidebarLinks.map((link) => (
                <SidebarItem key={link.key} item={link} active={link.key === "manage-reviews"} />
              ))}
            </div>
            <div className="p-6">
              <button
                type="button"
                onClick={() => router.push("/user/logout")}
                className="w-full rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Log out
              </button>
            </div>
          </aside>

          <main className="w-full flex-1 rounded-[28px] border border-white/10 bg-gradient-to-b from-white/10 to-black/25 p-6 shadow-2xl backdrop-blur">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-3xl font-semibold">Reviews</h1>
                <p className="mt-1 text-white/70">
                  {isAdmin
                    ? "Moderate customer reviews (edit/delete)."
                    : "View ratings and feedback for your published games."}
                </p>
                <div className="mt-2 flex items-center gap-3 text-sm text-white/70">
                  <Stars value={summary.avg} />
                  <span>
                    {summary.count === 0 ? "No reviews" : `${summary.avg.toFixed(1)} · ${summary.count} review${summary.count === 1 ? "" : "s"}`}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={loadReviews}
                className="rounded-full border border-white/20 bg-white/5 px-6 py-2 text-sm font-semibold text-white hover:bg-white/10"
              >
                Refresh
              </button>
            </div>

            {msg ? (
              <div
                className={`mt-6 rounded-2xl border px-5 py-4 text-sm ${
                  msg.type === "success"
                    ? "border-green-500/40 bg-green-500/10 text-green-200"
                    : "border-red-500/40 bg-red-500/10 text-red-200"
                }`}
              >
                {msg.text}
              </div>
            ) : null}

            <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_260px]">
              <div>
                <label className="text-sm text-white/70">Search</label>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by game, customer, stars, or text…"
                  className="mt-2 w-full rounded-[12px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30"
                />
              </div>
              <div>
                <label className="text-sm text-white/70">Game</label>
                <select
                  value={gameId}
                  onChange={(e) => setGameId(e.target.value)}
                  className="mt-2 w-full rounded-[12px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-white/30"
                >
                  <option value="">All games</option>
                  {games.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name || g.id}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6">
              {loading ? (
                <p className="text-white/70">Loading reviews…</p>
              ) : filtered.length === 0 ? (
                <p className="text-white/70">No reviews found.</p>
              ) : (
                <div className="space-y-4">
                  {filtered.slice(0, 200).map((r) => {
                    const isEditing = editingId === r.id;
                    const customerLabel = r.customer?.name || r.customer?.email || "Customer";
                    const gameLabel = r.game?.name || r.game?.id || "Game";
                    return (
                      <div key={r.id} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-1">
                            <p className="text-sm text-white/60">{gameLabel}</p>
                            <p className="text-lg font-semibold">{customerLabel}</p>
                            <div className="flex items-center gap-2 text-sm text-white/70">
                              <Stars value={r.rating} />
                              <span>
                                {r.updatedAt || r.createdAt
                                  ? new Date((r.updatedAt || r.createdAt) as any).toLocaleString()
                                  : ""}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {canEdit ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditMsg(null);
                                    if (editingId === r.id) {
                                      setEditingId(null);
                                      return;
                                    }
                                    setEditingId(r.id);
                                    setEditRating(r.rating);
                                    setEditText(r.reviewText);
                                  }}
                                  className="rounded-full border border-white/20 bg-white/5 px-5 py-2 text-sm font-semibold text-white hover:bg-white/10"
                                >
                                  {isEditing ? "Close" : "Edit"}
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!token) return;
                                    if (!confirm("Delete this review?")) return;
                                    setSaving(true);
                                    setEditMsg(null);
                                    try {
                                      const res = await fetch(
                                        gameStoreApiUrl(`/admin/reviews/${encodeURIComponent(r.id)}`),
                                        {
                                          method: "DELETE",
                                          headers: { Authorization: `Bearer ${token}` },
                                        }
                                      );
                                      if (!res.ok) {
                                        const data = await res.json().catch(() => null);
                                        throw new Error(data?.message || "Failed to delete review.");
                                      }
                                      setReviews((prev) => prev.filter((x) => x.id !== r.id));
                                      setEditingId(null);
                                      setMsg({ type: "success", text: "Review deleted." });
                                    } catch (err) {
                                      setEditMsg({
                                        type: "error",
                                        text: err instanceof Error ? err.message : "Failed to delete review.",
                                      });
                                    } finally {
                                      setSaving(false);
                                    }
                                  }}
                                  className="rounded-full border border-red-500/40 bg-red-500/10 px-5 py-2 text-sm font-semibold text-red-100 hover:bg-red-500/15 disabled:opacity-60"
                                  disabled={saving}
                                >
                                  Delete
                                </button>
                              </>
                            ) : null}
                          </div>
                        </div>

                        {isEditing ? (
                          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                            {editMsg ? (
                              <div
                                className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
                                  editMsg.type === "success"
                                    ? "border-green-500/40 bg-green-500/10 text-green-200"
                                    : "border-red-500/40 bg-red-500/10 text-red-200"
                                }`}
                              >
                                {editMsg.text}
                              </div>
                            ) : null}

                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                              <div className="space-y-2">
                                <p className="text-sm text-white/70">Rating</p>
                                <StarPicker
                                  value={editRating}
                                  onChange={setEditRating}
                                  disabled={saving}
                                />
                              </div>
                              <div className="w-full flex-1">
                                <p className="text-sm text-white/70">Review text</p>
                                <textarea
                                  value={editText}
                                  onChange={(e) => setEditText(e.target.value)}
                                  rows={4}
                                  className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30"
                                />
                                <div className="mt-2 flex items-center justify-between text-xs text-white/50">
                                  <span />
                                  <span>{Math.min(2000, editText.length)} / 2000</span>
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 flex items-center gap-3">
                              <button
                                type="button"
                                disabled={saving}
                                onClick={async () => {
                                  if (!token) return;
                                  setSaving(true);
                                  setEditMsg(null);
                                  try {
                                    const res = await fetch(
                                      gameStoreApiUrl(`/admin/reviews/${encodeURIComponent(r.id)}`),
                                      {
                                        method: "PATCH",
                                        headers: {
                                          Authorization: `Bearer ${token}`,
                                          "Content-Type": "application/json",
                                        },
                                        body: JSON.stringify({
                                          rating: editRating,
                                          reviewText: editText.trim(),
                                        }),
                                      }
                                    );
                                    const data = await res.json().catch(() => null);
                                    if (!res.ok) {
                                      throw new Error(data?.message || "Failed to update review.");
                                    }
                                    setReviews((prev) =>
                                      prev.map((x) => (x.id === r.id ? (data as Review) : x))
                                    );
                                    setEditMsg({ type: "success", text: "Review updated." });
                                  } catch (err) {
                                    setEditMsg({
                                      type: "error",
                                      text: err instanceof Error ? err.message : "Failed to update review.",
                                    });
                                  } finally {
                                    setSaving(false);
                                  }
                                }}
                                className="rounded-full bg-white px-6 py-2 text-sm font-semibold text-[#1b1a55] disabled:opacity-60"
                              >
                                {saving ? "Saving…" : "Save"}
                              </button>
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => setEditingId(null)}
                                className="rounded-full border border-white/20 bg-white/5 px-6 py-2 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-60"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="mt-4 whitespace-pre-line text-sm text-white/80">{r.reviewText}</p>
                        )}
                      </div>
                    );
                  })}

                  {filtered.length > 200 ? (
                    <p className="text-xs text-white/50">Showing the first 200 results.</p>
                  ) : null}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

