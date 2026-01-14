"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/app/context/AuthContext";
import { gameStoreApiUrl } from "@/lib/game-store-api";
import { PublisherAccountSidebar } from "@/components/PublisherAccountSidebar";

type Game = {
  id: string;
  name: string;
  genre?: string;
  version?: string;
  originalPrice?: number;
  discountPrice?: number;
  releaseStatus?: string;
  releaseDate?: string;
  updatedAt?: string;
};

type KeyStats = {
  available: number;
  sold: number;
  reserved: number;
  total: number;
};

type GameStats = {
  keys: KeyStats;
  sales: { totalRevenue: number; totalSales: number };
};

type RevenuePoint = { period: string; revenue: number };

type DashboardSummary = {
  games: {
    total: number;
    statusCounts: Record<string, number>;
    list: Game[];
  };
  keys: KeyStats;
  revenue: {
    byDay: RevenuePoint[];
    byMonth: RevenuePoint[];
    byYear: RevenuePoint[];
  };
};

export default function PublisherDashboardPage() {
  const { user, token } = useAuth();
  const router = useRouter();

  const [games, setGames] = useState<Game[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedMsg, setSeedMsg] = useState<string | null>(null);

  const [pricing, setPricing] = useState({ originalPrice: "", discountPrice: "" });
  const [batchQty, setBatchQty] = useState(10);
  const [batchVersion, setBatchVersion] = useState("");
  const [stats, setStats] = useState<GameStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !user || (user.accountType !== "publisher" && user.accountType !== "admin")) {
      router.replace("/user/login?next=/publisher/dashboard");
      return;
    }
    let active = true;
    (async () => {
      setLoading(true);
      setErrMsg(null);
      setSeedMsg(null);
      try {
        const res = await fetch(gameStoreApiUrl("/publisher/dashboard/summary"), {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data) {
          throw new Error(data?.message || "Failed to load dashboard");
        }
        if (!active) return;
        setSummary(data);
        const list = Array.isArray(data?.games?.list) ? (data.games.list as Game[]) : [];
        setGames(list);
        if (list.length && !selectedId) {
          setSelectedId(list[0].id);
          setPricing({
            originalPrice: list[0].originalPrice?.toString() ?? "",
            discountPrice: list[0].discountPrice?.toString() ?? "",
          });
        }
      } catch (err) {
        if (!active) return;
        setErrMsg(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user]);

  const selectedGame = useMemo(() => games.find((g) => g.id === selectedId) || null, [games, selectedId]);
  const allowDevSeed = process.env.NEXT_PUBLIC_ALLOW_DEV_SEED === "true";

  const revenue30d = useMemo(() => {
    const points = summary?.revenue?.byDay ?? [];
    return points.reduce((acc, p) => acc + (Number.isFinite(p.revenue) ? p.revenue : 0), 0);
  }, [summary]);

  const lastDays = useMemo(() => {
    const points = summary?.revenue?.byDay ?? [];
    return points.slice(Math.max(0, points.length - 10));
  }, [summary]);

  useEffect(() => {
    if (!selectedId || !token) {
      setStats(null);
      return;
    }
    let active = true;
    (async () => {
      setStatsLoading(true);
      try {
        const res = await fetch(gameStoreApiUrl(`/publisher/games/${selectedId}/stats`), {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data) throw new Error(data?.message || "Failed to load stats");
        if (!active) return;
        setStats(data);
      } catch (err) {
        if (!active) return;
        setErrMsg(err instanceof Error ? err.message : "Failed to load stats");
      } finally {
        if (active) setStatsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [selectedId, token]);

  const updatePricing = async () => {
    if (!selectedId || !token) return;
    setToast(null);
    try {
      const res = await fetch(gameStoreApiUrl(`/publisher/games/${selectedId}/pricing`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          originalPrice: pricing.originalPrice ? Number(pricing.originalPrice) : undefined,
          discountPrice: pricing.discountPrice ? Number(pricing.discountPrice) : undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Failed to update pricing");
      setToast("Pricing updated");
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : "Failed to update pricing");
    }
  };

  const createKeys = async () => {
    if (!selectedId || !token) return;
    setToast(null);
    try {
      const res = await fetch(gameStoreApiUrl(`/publisher/games/${selectedId}/keys/batch`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ quantity: batchQty, gameVersion: batchVersion || undefined }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Failed to create keys");
      setToast(`Created ${data?.created ?? batchQty} keys`);
      // refresh stats
      setStats((prev) =>
        prev
          ? {
              ...prev,
              keys: data?.stats ?? prev.keys,
            }
          : prev
      );
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : "Failed to create keys");
    }
  };

  const seedDemo = async () => {
    if (!allowDevSeed || !token) return;
    setSeedLoading(true);
    setSeedMsg(null);
    setErrMsg(null);
    try {
      const res = await fetch(gameStoreApiUrl("/dev/seed/publisher-dashboard"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Failed to seed demo data");
      setSeedMsg("Demo data created. Refreshing dashboard...");

      const res2 = await fetch(gameStoreApiUrl("/publisher/dashboard/summary"), {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const data2 = await res2.json().catch(() => null);
      if (res2.ok && data2) {
        setSummary(data2);
        const list = Array.isArray(data2?.games?.list) ? (data2.games.list as Game[]) : [];
        setGames(list);
        if (!selectedId && list.length) setSelectedId(list[0].id);
      }
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : "Failed to seed demo data");
    } finally {
      setSeedLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#070f2b] text-white -mx-5 sm:-mx-10">
      <div className="flex w-full flex-col gap-12 px-5 pb-16 pt-6 sm:px-8 lg:px-10">
        <TopBar active="browse" />

        <div className="grid gap-10 lg:grid-cols-[360px_1fr]">
          <PublisherAccountSidebar />
          <div className="space-y-6">
        <section className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-black/20 p-6 shadow-2xl backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Dashboard</p>
              <h1 className="text-2xl font-semibold">Publisher overview</h1>
            </div>
            <div className="flex items-center gap-3">
              {allowDevSeed ? (
                <button
                  onClick={seedDemo}
                  disabled={seedLoading}
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#1b1a55] disabled:opacity-60"
                >
                  {seedLoading ? "Seeding..." : "Seed demo data"}
                </button>
              ) : null}
              <button
                onClick={() => router.push("/user/manage-games")}
                className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/15 hover:bg-white/15"
              >
                + New Game
              </button>
            </div>
          </div>

          {loading ? (
            <div className="mt-4 text-white/70">Loading...</div>
          ) : errMsg ? (
            <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-3 text-sm text-red-100">{errMsg}</div>
          ) : (
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-[#0c143d]/60 p-4">
                <p className="text-sm text-white/60">Revenue (last 30 days)</p>
                <p className="mt-1 text-2xl font-semibold">${revenue30d.toFixed(2)}</p>
                <p className="mt-2 text-xs text-white/50">Based on completed orders.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#0c143d]/60 p-4">
                <p className="text-sm text-white/60">Games</p>
                <p className="mt-1 text-2xl font-semibold">{summary?.games?.total ?? 0}</p>
                <p className="mt-2 text-xs text-white/50">Includes Released / Upcoming / Delisted.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#0c143d]/60 p-4">
                <p className="text-sm text-white/60">Keys (available / sold)</p>
                <p className="mt-1 text-2xl font-semibold">
                  {summary?.keys?.available ?? 0} / {summary?.keys?.sold ?? 0}
                </p>
                <p className="mt-2 text-xs text-white/50">Reserved: {summary?.keys?.reserved ?? 0}</p>
              </div>
            </div>
          )}

          {seedMsg ? (
            <div className="mt-4 rounded-xl border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-100">{seedMsg}</div>
          ) : null}

          {lastDays.length ? (
            <div className="mt-6 rounded-2xl border border-white/10 bg-[#0c143d]/40 p-4">
              <p className="text-sm font-semibold">Recent revenue</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {lastDays.map((p) => (
                  <div key={p.period} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                    <span className="text-xs text-white/60">{p.period}</span>
                    <span className="text-sm font-semibold">${p.revenue.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <aside className="rounded-3xl border border-white/10 bg-[#0c143d]/60 p-4 shadow-xl backdrop-blur">
            <div className="mb-4 px-2 text-xs uppercase tracking-wide text-white/50">Your games</div>
            {loading ? (
              <div className="px-2 py-3 text-white/70">Loading...</div>
            ) : errMsg ? (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-3 text-sm text-red-100">{errMsg}</div>
            ) : (
              <div className="flex flex-col gap-2">
                {games.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => {
                      setSelectedId(g.id);
                      setPricing({
                        originalPrice: g.originalPrice?.toString() ?? "",
                        discountPrice: g.discountPrice?.toString() ?? "",
                      });
                    }}
                    className={`flex flex-col rounded-2xl px-3 py-3 text-left transition ${
                      selectedId === g.id ? "bg-white/15 border border-white/20" : "bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <span className="text-sm font-semibold">{g.name}</span>
                    <span className="text-xs text-white/60">
                      {g.genre || "—"} · v{g.version || "1.0"}
                    </span>
                  </button>
                ))}
                {games.length === 0 ? (
                  <div className="px-2 py-2 text-sm text-white/60">No games yet.</div>
                ) : null}
              </div>
            )}
          </aside>

          <main className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-black/20 p-6 shadow-2xl backdrop-blur">
            {!selectedGame ? (
              <div className="text-white/70">Select a game to manage pricing, keys, and stats.</div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-semibold">{selectedGame.name}</h1>
                    <p className="text-white/60">
                      {selectedGame.genre || "—"} · v{selectedGame.version || "1.0"}
                    </p>
                  </div>
                  <button
                    onClick={() => router.push("/user/manage-games")}
                    className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#1b1a55]"
                  >
                    + New Game
                  </button>
                </div>

                <section className="rounded-2xl border border-white/10 bg-[#0c143d]/60 p-4">
                  <h2 className="text-lg font-semibold mb-3">Pricing</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-sm text-white/70">Original Price</label>
                      <input
                        value={pricing.originalPrice}
                        onChange={(e) => setPricing((p) => ({ ...p, originalPrice: e.target.value }))}
                        type="number"
                        min="0"
                        className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-white/30"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-white/70">Discount Price</label>
                      <input
                        value={pricing.discountPrice}
                        onChange={(e) => setPricing((p) => ({ ...p, discountPrice: e.target.value }))}
                        type="number"
                        min="0"
                        className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-white/30"
                      />
                    </div>
                  </div>
                  <button
                    onClick={updatePricing}
                    className="mt-4 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#1b1a55]"
                  >
                    Update Pricing
                  </button>
                </section>

                <section className="rounded-2xl border border-white/10 bg-[#0c143d]/60 p-4">
                  <h2 className="text-lg font-semibold mb-3">Keys</h2>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="text-sm text-white/70">Quantity</label>
                      <input
                        value={batchQty}
                        onChange={(e) => setBatchQty(Math.max(1, Number(e.target.value) || 1))}
                        type="number"
                        min="1"
                        className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-white/30"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-sm text-white/70">Game Version (optional)</label>
                      <input
                        value={batchVersion}
                        onChange={(e) => setBatchVersion(e.target.value)}
                        placeholder={selectedGame.version || "1.0"}
                        className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-white/30"
                      />
                    </div>
                  </div>
                  <button
                    onClick={createKeys}
                    className="mt-4 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#1b1a55]"
                  >
                    Create Key Batch
                  </button>
                </section>

                <section className="rounded-2xl border border-white/10 bg-[#0c143d]/60 p-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Stats</h2>
                    {statsLoading ? <span className="text-xs text-white/70">Refreshing...</span> : null}
                  </div>
                  {stats ? (
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div className="rounded-xl bg-white/5 p-3">
                        <p className="text-sm text-white/60">Keys</p>
                        <p className="text-sm text-white/80">Available: {stats.keys.available}</p>
                        <p className="text-sm text-white/80">Sold: {stats.keys.sold}</p>
                        <p className="text-sm text-white/80">Reserved: {stats.keys.reserved}</p>
                        <p className="text-sm text-white/80">Total: {stats.keys.total}</p>
                      </div>
                      <div className="rounded-xl bg-white/5 p-3">
                        <p className="text-sm text-white/60">Sales</p>
                        <p className="text-sm text-white/80">Revenue: ${stats.sales.totalRevenue?.toFixed(2) ?? "0.00"}</p>
                        <p className="text-sm text-white/80">Units sold: {stats.sales.totalSales}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-white/70">No stats yet.</p>
                  )}
                </section>

                {toast ? (
                  <div className="rounded-xl border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-100">
                    {toast}
                  </div>
                ) : null}
                {errMsg ? (
                  <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                    {errMsg}
                  </div>
                ) : null}
              </div>
            )}
          </main>
        </div>
          </div>
        </div>
      </div>
    </div>
  );
}



