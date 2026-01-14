"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/app/context/AuthContext";
import { gameStoreApiUrl } from "@/lib/game-store-api";
import { PublisherAccountSidebar } from "@/components/PublisherAccountSidebar";

type Message = { type: "error" | "success"; text: string } | null;

type Publisher = {
  id: string;
  publisherName?: string;
  email?: string;
};

type GameRow = {
  id: string;
  name: string;
  genre: string;
  description: string;
  imageUrl?: string;
  videoUrl?: string;
  steamAppId?: number;
  releaseDate: string;
  releaseStatus?: "Released" | "Upcoming" | "Delisted" | string;
  version: string;
  originalPrice: number;
  discountPrice?: number;
  publisherId: string;
  publisher?: { id: string; publisherName?: string; email?: string };
};

type GameForm = {
  publisherId: string;
  name: string;
  genre: string;
  description: string;
  imageUrl: string;
  videoUrl: string;
  steamAppId: string;
  releaseDate: string;
  version: string;
  originalPrice: string;
  discountPrice: string;
};

type SidebarLink = { key: string; title: string; subtitle: string; href: string };

function SidebarItem({ item, active }: { item: SidebarLink; active?: boolean }) {
  return (
    <Link
      href={item.href}
      className={`relative block px-6 py-5 transition ${active ? "bg-white/10" : "hover:bg-white/5"}`}
    >
      {active ? <span className="absolute left-0 top-0 h-full w-2 bg-white/20" /> : null}
      <p className={`text-lg font-semibold ${active ? "text-white/60" : "text-white"}`}>{item.title}</p>
      <p className="mt-1 text-sm text-white/55">{item.subtitle}</p>
    </Link>
  );
}

function emptyForm(): GameForm {
  return {
    publisherId: "",
    name: "",
    genre: "",
    description: "",
    imageUrl: "",
    videoUrl: "",
    steamAppId: "",
    releaseDate: "",
    version: "",
    originalPrice: "",
    discountPrice: "",
  };
}

function formatUsd(amount: number | undefined) {
  const value = typeof amount === "number" && Number.isFinite(amount) ? amount : 0;
  return `$${value.toFixed(2)}`;
}

function toDateInput(value: unknown): string {
  if (!value) return "";
  const d = new Date(String(value));
  if (!Number.isFinite(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export default function ManageGamesPage() {
  const router = useRouter();
  const { user, token, logout } = useAuth();
  const [mounted, setMounted] = useState(false);

  const [games, setGames] = useState<GameRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<Message>(null);

  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [publishersLoading, setPublishersLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<GameForm>(emptyForm());
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isAdmin = user?.accountType === "admin";
  const isPublisher = user?.accountType === "publisher";
  const canAccess = Boolean(token && (isAdmin || isPublisher));

  const sidebarLinks: SidebarLink[] = useMemo(() => {
    if (isAdmin) {
      return [
        { key: "personal", title: "Personal Information", subtitle: "Modify your personal information", href: "/user/profile" },
        { key: "manage-accounts", title: "Manage Accounts", subtitle: "Create or edit admin/publisher accounts", href: "/user/manage-accounts" },
        { key: "manage-games", title: "Manage Games", subtitle: "Create or edit games", href: "/user/manage-games" },
        { key: "manage-promos", title: "Game Sale", subtitle: "Create and manage promo codes", href: "/user/manage-promos" },
        { key: "manage-orders", title: "Manage Orders", subtitle: "View customer purchases", href: "/user/manage-orders" },
        { key: "manage-refunds", title: "Manage Refunds", subtitle: "Review and process refunds", href: "/user/manage-refunds" },
        { key: "manage-reports", title: "Manage Reports", subtitle: "Review reported items", href: "/user/manage-reports" },
      ];
    }

    return [
      { key: "personal", title: "Personal Information", subtitle: "Modify your personal information", href: "/user/profile" },
      { key: "manage-games", title: "Manage Games", subtitle: "Create or edit games", href: "/user/manage-games" },
      { key: "manage-promos", title: "Game Sale", subtitle: "Create and manage promo codes", href: "/user/manage-promos" },
    ];
  }, [isAdmin]);

  useEffect(() => {
    if (!token) {
      router.replace(`/user/login?next=${encodeURIComponent("/user/manage-games")}`);
      return;
    }
    if (!isAdmin && !isPublisher) return;
  }, [isAdmin, isPublisher, router, token]);

  const loadGames = async () => {
    if (!token || (!isAdmin && !isPublisher)) return;
    setLoading(true);
    setMsg(null);
    try {
      const url = isAdmin ? gameStoreApiUrl("/admin/games") : gameStoreApiUrl("/publisher/games/me");
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Failed to load games");
      setGames(Array.isArray(data) ? data : []);
    } catch (err) {
      setMsg({ type: "error", text: err instanceof Error ? err.message : "Failed to load games" });
      setGames([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPublishers = async () => {
    if (!token || !isAdmin) return;
    setPublishersLoading(true);
    try {
      const res = await fetch(gameStoreApiUrl("/admin/publishers"), {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Failed to load publishers");
      setPublishers(Array.isArray(data) ? data : []);
    } catch {
      setPublishers([]);
    } finally {
      setPublishersLoading(false);
    }
  };

  useEffect(() => {
    void loadGames();
  }, [token, isAdmin, isPublisher]);

  useEffect(() => {
    void loadPublishers();
  }, [token, isAdmin]);

  const openCreate = () => {
    setMsg(null);
    setForm(emptyForm());
    setEditId(null);
    setEditOpen(false);
    setCreateOpen(true);
  };

  const openEdit = (game: GameRow) => {
    setMsg(null);
    setCreateOpen(false);
    setEditId(game.id);
    setForm({
      publisherId: game.publisherId ?? "",
      name: game.name ?? "",
      genre: game.genre ?? "",
      description: game.description ?? "",
      imageUrl: game.imageUrl ?? "",
      videoUrl: game.videoUrl ?? "",
      steamAppId: game.steamAppId !== undefined && game.steamAppId !== null ? String(game.steamAppId) : "",
      releaseDate: toDateInput(game.releaseDate),
      version: game.version ?? "",
      originalPrice: Number.isFinite(game.originalPrice) ? String(game.originalPrice) : "",
      discountPrice:
        typeof game.discountPrice === "number" && Number.isFinite(game.discountPrice) ? String(game.discountPrice) : "",
    });
    setEditOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setCreateOpen(false);
    setEditOpen(false);
    setEditId(null);
  };

  const closeModalForce = () => {
    setCreateOpen(false);
    setEditOpen(false);
    setEditId(null);
  };

  const validateForm = (): { ok: true; payload: any } | { ok: false; error: string } => {
    const name = form.name.trim();
    const genre = form.genre.trim();
    const description = form.description.trim();
    const version = form.version.trim();
    const releaseDate = form.releaseDate.trim();

    if (isAdmin && !form.publisherId.trim()) return { ok: false, error: "Select a publisher." };
    if (!name) return { ok: false, error: "Name is required." };
    if (!genre) return { ok: false, error: "Genre is required." };
    if (!description) return { ok: false, error: "Description is required." };
    if (!releaseDate) return { ok: false, error: "Release date is required." };
    if (!version) return { ok: false, error: "Version is required." };

    const originalPrice = Number(form.originalPrice || 0);
    if (!Number.isFinite(originalPrice) || originalPrice < 0) return { ok: false, error: "Original price is invalid." };

    const discountPrice = form.discountPrice.trim() ? Number(form.discountPrice) : undefined;
    if (discountPrice !== undefined) {
      if (!Number.isFinite(discountPrice) || discountPrice < 0) return { ok: false, error: "Discount price is invalid." };
      if (discountPrice > originalPrice) return { ok: false, error: "Discount price cannot exceed original price." };
    }

    const payload: any = {
      name,
      genre,
      description,
      imageUrl: form.imageUrl.trim() || undefined,
      videoUrl: form.videoUrl.trim() || undefined,
      releaseDate,
      version,
      originalPrice,
      discountPrice: discountPrice === 0 ? undefined : discountPrice,
    };

    const steamAppId = form.steamAppId.trim() ? Number(form.steamAppId) : undefined;
    if (steamAppId !== undefined) {
      if (!Number.isFinite(steamAppId) || steamAppId < 0) return { ok: false, error: "Steam App ID is invalid." };
      payload.steamAppId = Math.floor(steamAppId);
    }

    if (isAdmin) payload.publisherId = form.publisherId.trim();

    return { ok: true, payload };
  };

  const createGame = async () => {
    if (!token) return;
    const validated = validateForm();
    if (!validated.ok) {
      setMsg({ type: "error", text: validated.error });
      return;
    }
    setSubmitting(true);
    setMsg(null);
    try {
      const res = await fetch(gameStoreApiUrl("/games"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(validated.payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Failed to create game");
      setMsg({ type: "success", text: "Game created." });
      closeModalForce();
      await loadGames();
    } catch (err) {
      setMsg({ type: "error", text: err instanceof Error ? err.message : "Failed to create game" });
    } finally {
      setSubmitting(false);
    }
  };

  const updateGame = async () => {
    if (!token || !editId) return;
    const validated = validateForm();
    if (!validated.ok) {
      setMsg({ type: "error", text: validated.error });
      return;
    }
    const { publisherId: _ignorePublisherId, ...payload } = validated.payload;
    setSubmitting(true);
    setMsg(null);
    try {
      const res = await fetch(gameStoreApiUrl(`/games/${editId}`), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Failed to update game");
      setMsg({ type: "success", text: "Game updated." });
      closeModalForce();
      await loadGames();
    } catch (err) {
      setMsg({ type: "error", text: err instanceof Error ? err.message : "Failed to update game" });
    } finally {
      setSubmitting(false);
    }
  };

  const delistGame = async (gameId: string) => {
    if (!token) return;
    setMsg(null);
    if (!confirm("Delist this game? Customers will no longer be able to purchase it.")) return;
    try {
      const res = await fetch(gameStoreApiUrl(`/games/${gameId}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Failed to delist game");
      setMsg({ type: "success", text: "Game delisted." });
      await loadGames();
    } catch (err) {
      setMsg({ type: "error", text: err instanceof Error ? err.message : "Failed to delist game" });
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#070f2b] text-white -mx-5 sm:-mx-10">
        <div className="flex w-full flex-col gap-8 px-5 pb-16 pt-6 sm:px-8 lg:px-10">
          <div className="mx-auto w-full max-w-xl rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-black/20 p-8 text-center shadow-2xl backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Manage Games</p>
            <h1 className="mt-2 text-2xl font-semibold">Loading...</h1>
          </div>
        </div>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="min-h-screen bg-[#070f2b] text-white -mx-5 sm:-mx-10">
        <div className="flex w-full flex-col gap-8 px-5 pb-16 pt-6 sm:px-8 lg:px-10">
          <TopBar />
          <div className="mx-auto w-full max-w-xl rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-black/20 p-8 text-center shadow-2xl backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Manage Games</p>
            <h1 className="mt-2 text-2xl font-semibold">Access denied</h1>
            <p className="mt-3 text-sm text-white/70">Log in with a publisher or admin account to manage games.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/browse"
                className="rounded-full border border-white/25 px-5 py-2 text-sm font-semibold text-white hover:bg-white/10"
              >
                Browse Store
              </Link>
              <button
                type="button"
                onClick={() => {
                  logout();
                  router.push("/user/login?next=/user/manage-games");
                }}
                className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-[#1b1a55] hover:bg-white/90"
              >
                Log in
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const modalOpen = createOpen || editOpen;
  const modalTitle = createOpen ? "Create Game" : "Edit Game";

  return (
    <div className="min-h-screen bg-[#070f2b] text-white -mx-5 sm:-mx-10">
      <div className="flex w-full flex-col gap-8 px-5 pb-16 pt-6 sm:px-8 lg:px-10">
        <TopBar />

        <div className="grid gap-10 lg:grid-cols-[360px_1fr]">
          {isPublisher ? (
            <PublisherAccountSidebar />
          ) : (
            <aside className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-black/20 shadow-2xl backdrop-blur">
              <div className="bg-white/10 px-6 py-6">
                <p className="text-2xl font-semibold">My Account</p>
                <p className="mt-1 text-sm text-white/60">Account Management</p>
              </div>
              <div className="divide-y divide-white/10">
                {sidebarLinks.map((item) => (
                  <SidebarItem key={item.key} item={item} active={item.href === "/user/manage-games"} />
                ))}
              </div>
              <div className="px-6 py-6">
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    router.push("/");
                  }}
                  className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
                >
                  Log out
                </button>
              </div>
            </aside>
          )}

          <main className="rounded-3xl border border-white/10 bg-[#0c143d]/70 p-8 shadow-2xl backdrop-blur">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Manage Games</p>
                <h1 className="mt-2 text-2xl font-semibold">{isAdmin ? "All Games" : "Your Games"}</h1>
                <p className="mt-2 text-sm text-white/60">
                  {isAdmin ? "Admin can manage all games." : "Publishers can manage games they added."}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => void loadGames()}
                  disabled={loading}
                  className={`rounded-full border border-white/25 px-5 py-2 text-sm font-semibold text-white ${
                    loading ? "opacity-60" : "hover:bg-white/10"
                  }`}
                >
                  {loading ? "Loading…" : "Refresh"}
                </button>
                <button
                  type="button"
                  onClick={openCreate}
                  className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-[#1b1a55] hover:bg-white/90"
                >
                  Add Game
                </button>
              </div>
            </div>

            {msg ? (
              <div
                className={`mt-6 rounded-2xl border p-4 text-sm ${
                  msg.type === "error"
                    ? "border-red-500/40 bg-red-500/10 text-red-100"
                    : "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
                }`}
              >
                {msg.text}
              </div>
            ) : null}

            <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/10 text-sm">
                  <thead className="bg-white/5 text-white/70">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Game</th>
                      {isAdmin ? <th className="px-4 py-3 text-left font-semibold">Publisher</th> : null}
                      <th className="px-4 py-3 text-left font-semibold">Genre</th>
                      <th className="px-4 py-3 text-left font-semibold">Release</th>
                      <th className="px-4 py-3 text-left font-semibold">Price</th>
                      <th className="px-4 py-3 text-left font-semibold">Status</th>
                      <th className="px-4 py-3 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {games.length === 0 ? (
                      <tr>
                        <td className="px-4 py-6 text-white/70" colSpan={isAdmin ? 7 : 6}>
                          {loading ? "Loading games..." : "No games found."}
                        </td>
                      </tr>
                    ) : (
                      games.map((g) => (
                        <tr key={g.id} className="bg-white/[0.02]">
                          <td className="px-4 py-4">
                            <div className="font-semibold text-white">{g.name}</div>
                            <div className="mt-1 text-xs text-white/60">{g.version ? `v${g.version}` : null}</div>
                          </td>
                          {isAdmin ? (
                            <td className="px-4 py-4 text-white/70">
                              {g.publisher?.publisherName || g.publisher?.email || g.publisherId || "—"}
                            </td>
                          ) : null}
                          <td className="px-4 py-4 text-white/70">{g.genre}</td>
                          <td className="px-4 py-4 text-white/70">{toDateInput(g.releaseDate) || "—"}</td>
                          <td className="px-4 py-4 text-white/70">
                            <div>{formatUsd(g.discountPrice ?? g.originalPrice)}</div>
                            {typeof g.discountPrice === "number" ? (
                              <div className="text-xs text-white/50 line-through">{formatUsd(g.originalPrice)}</div>
                            ) : null}
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
                                String(g.releaseStatus) === "Delisted"
                                  ? "border-red-500/40 bg-red-500/10 text-red-100"
                                  : "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
                              }`}
                            >
                              {g.releaseStatus || "Released"}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openEdit(g)}
                                className="rounded-full border border-white/25 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => void delistGame(g.id)}
                                className="rounded-full border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-100 hover:bg-red-500/20"
                                disabled={String(g.releaseStatus) === "Delisted"}
                              >
                                {String(g.releaseStatus) === "Delisted" ? "Delisted" : "Delist"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </main>
        </div>
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-10">
          <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-[#0c143d] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Manage Games</p>
                <h2 className="mt-2 text-xl font-semibold">{modalTitle}</h2>
                <p className="mt-2 text-sm text-white/60">
                  {createOpen ? "Create a new game listing." : "Update game details."}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className={`rounded-full border border-white/25 px-4 py-2 text-sm font-semibold text-white ${
                  submitting ? "opacity-60" : "hover:bg-white/10"
                }`}
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {isAdmin ? (
                <div className="md:col-span-2">
                  <label className="text-sm font-semibold text-white/80">Publisher</label>
                  <select
                    value={form.publisherId}
                    onChange={(e) => setForm((p) => ({ ...p, publisherId: e.target.value }))}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
                    disabled={publishersLoading || submitting || editOpen}
                  >
                    <option value="">{publishersLoading ? "Loading..." : "Select publisher..."}</option>
                    {publishers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.publisherName || p.email || p.id}
                      </option>
                    ))}
                  </select>
                  {editOpen ? (
                    <p className="mt-2 text-xs text-white/60">Publisher cannot be changed after creation.</p>
                  ) : null}
                </div>
              ) : null}

              <div>
                <label className="text-sm font-semibold text-white/80">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
                  placeholder="Game title"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-white/80">Genre</label>
                <input
                  value={form.genre}
                  onChange={(e) => setForm((p) => ({ ...p, genre: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
                  placeholder="Action, RPG..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-white/80">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  className="mt-2 h-28 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
                  placeholder="About the game..."
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-white/80">Release Date</label>
                <input
                  type="date"
                  value={form.releaseDate}
                  onChange={(e) => setForm((p) => ({ ...p, releaseDate: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-white/80">Version</label>
                <input
                  value={form.version}
                  onChange={(e) => setForm((p) => ({ ...p, version: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
                  placeholder="1.0"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-white/80">Original Price (USD)</label>
                <input
                  value={form.originalPrice}
                  onChange={(e) => setForm((p) => ({ ...p, originalPrice: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
                  placeholder="59.99"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-white/80">Discount Price (USD)</label>
                <input
                  value={form.discountPrice}
                  onChange={(e) => setForm((p) => ({ ...p, discountPrice: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
                  placeholder="49.99 (optional)"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-white/80">Image URL</label>
                <input
                  value={form.imageUrl}
                  onChange={(e) => setForm((p) => ({ ...p, imageUrl: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-white/80">Video URL</label>
                <input
                  value={form.videoUrl}
                  onChange={(e) => setForm((p) => ({ ...p, videoUrl: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
                  placeholder="https://..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-white/80">Steam App ID (optional)</label>
                <input
                  value={form.steamAppId}
                  onChange={(e) => setForm((p) => ({ ...p, steamAppId: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
                  placeholder="123456"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className={`rounded-full border border-white/25 px-5 py-2 text-sm font-semibold text-white ${
                  submitting ? "opacity-60" : "hover:bg-white/10"
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void (createOpen ? createGame() : updateGame())}
                disabled={submitting}
                className={`rounded-full bg-white px-5 py-2 text-sm font-semibold text-[#1b1a55] ${
                  submitting ? "opacity-60" : "hover:bg-white/90"
                }`}
              >
                {submitting ? "Saving..." : createOpen ? "Create" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
