"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/app/context/AuthContext";
import { gameStoreApiUrl } from "@/lib/game-store-api";

type Game = {
  id: string;
  name: string;
  genre?: string;
  version?: string;
  originalPrice?: number;
  discountPrice?: number;
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

type DashboardSummary = {
  games: {
    total: number;
    statusCounts: Record<string, number>;
  };
  keys: KeyStats;
  revenue: {
    byDay: Array<{ period: string; revenue: number }>;
    byMonth: Array<{ period: string; revenue: number }>;
    byYear: Array<{ period: string; revenue: number }>;
  };
};

function formatUsd(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "$0.00";
  return `$${value.toFixed(2)}`;
}

export default function PublisherDashboardPage() {
  const { user, token } = useAuth();
  const router = useRouter();

  const [games, setGames] = useState<Game[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const [pricing, setPricing] = useState({ originalPrice: "", discountPrice: "" });
  const [batchQty, setBatchQty] = useState(10);
  const [batchVersion, setBatchVersion] = useState("");
  const [stats, setStats] = useState<GameStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => {
    if (!token || !user || (user.accountType !== "publisher" && user.accountType !== "admin")) {
      router.replace("/user/login?next=/publisher/dashboard");
      return;
    }
    let active = true;
    (async () => {
      setLoading(true);
      setErrMsg(null);
      try {
        const res = await fetch(gameStoreApiUrl("/publisher/games/me"), {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !Array.isArray(data)) {
          throw new Error(data?.message || "Failed to load games");
        }
        if (!active) return;
        setGames(data);
        if (data.length && !selectedId) {
          setSelectedId(data[0].id);
          setPricing({
            originalPrice: data[0].originalPrice?.toString() ?? "",
            discountPrice: data[0].discountPrice?.toString() ?? "",
          });
        }
      } catch (err) {
        if (!active) return;
        setErrMsg(err instanceof Error ? err.message : "Failed to load games");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user]);

  useEffect(() => {
    if (!token || !user || (user.accountType !== "publisher" && user.accountType !== "admin")) return;
    let active = true;
    (async () => {
      setSummaryLoading(true);
      try {
        const res = await fetch(gameStoreApiUrl("/publisher/dashboard/summary"), {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data) throw new Error(data?.message || "Failed to load dashboard summary");
        if (!active) return;
        setSummary(data as DashboardSummary);
      } catch (err) {
        if (!active) return;
        setErrMsg(err instanceof Error ? err.message : "Failed to load dashboard summary");
      } finally {
        if (active) setSummaryLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [token, user]);

  const selectedGame = useMemo(() => games.find((g) => g.id === selectedId) || null, [games, selectedId]);

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

  return (
    <div className="min-h-screen w-full bg-[#070f2b] text-white -mx-5 sm:-mx-10">
      <div className="flex w-full flex-col gap-8 px-5 pb-16 pt-6 sm:px-8 lg:px-10">
        <TopBar active="browse" />

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <aside className="rounded-3xl border border-white/10 bg-[#0c143d]/60 p-4 shadow-xl backdrop-blur">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/50">Dashboard</p>
                  <p className="mt-1 text-sm text-white/70">Revenue / inventory / status</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!token) return;
                    setSummaryLoading(true);
                    fetch(gameStoreApiUrl("/publisher/dashboard/summary"), {
                      headers: { Authorization: `Bearer ${token}` },
                      cache: "no-store",
                    })
                      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
                      .then(({ ok, d }) => {
                        if (!ok) throw new Error(d?.message || "Failed to refresh");
                        setSummary(d as DashboardSummary);
                      })
                      .catch((e) => setErrMsg(e instanceof Error ? e.message : "Failed to refresh"))
                      .finally(() => setSummaryLoading(false));
                  }}
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-white hover:bg-white/10"
                >
                  {summaryLoading ? "…" : "Refresh"}
                </button>
              </div>

              {!summary ? (
                <p className="mt-3 text-sm text-white/70">{summaryLoading ? "Loading…" : "No data yet."}</p>
              ) : (
                <div className="mt-4 space-y-3 text-sm text-white/80">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">Games</span>
                    <span className="font-semibold">{summary.games.total}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(summary.games.statusCounts || {}).map(([k, v]) => (
                      <span key={k} className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">
                        {k}: {v}
                      </span>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 text-xs text-white/80">
                    <p>Available: {summary.keys.available}</p>
                    <p>Sold: {summary.keys.sold}</p>
                    <p>Reserved: {summary.keys.reserved}</p>
                    <p>Total: {summary.keys.total}</p>
                  </div>
                  <div className="pt-2">
                    <p className="text-xs text-white/60">Revenue (last 30 days)</p>
                    <p className="mt-1 text-lg font-semibold">
                      {formatUsd((summary.revenue.byDay || []).reduce((acc, r) => acc + (Number(r.revenue) || 0), 0))}
                    </p>
                    <div className="mt-2 space-y-2">
                      {(summary.revenue.byDay || []).slice(-5).map((r) => (
                        <div key={r.period} className="flex items-center justify-between gap-3 text-[11px] text-white/70">
                          <span className="w-[84px] shrink-0">{r.period}</span>
                          <span className="text-right">{formatUsd(Number(r.revenue) || 0)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-white/60">By month (last 3)</p>
                        <div className="mt-2 space-y-2">
                          {(summary.revenue.byMonth || []).slice(-3).map((r) => (
                            <div key={r.period} className="flex items-center justify-between gap-3 text-[11px] text-white/70">
                              <span className="w-[84px] shrink-0">{r.period}</span>
                              <span className="text-right">{formatUsd(Number(r.revenue) || 0)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-white/60">By year (last 3)</p>
                        <div className="mt-2 space-y-2">
                          {(summary.revenue.byYear || []).slice(-3).map((r) => (
                            <div key={r.period} className="flex items-center justify-between gap-3 text-[11px] text-white/70">
                              <span className="w-[84px] shrink-0">{r.period}</span>
                              <span className="text-right">{formatUsd(Number(r.revenue) || 0)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

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
                      {g.genre || "â€”"} Â· v{g.version || "1.0"}
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
                      {selectedGame.genre || "â€”"} Â· v{selectedGame.version || "1.0"}
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
                    {statsLoading ? <span className="text-xs text-white/70">Refreshingâ€¦</span> : null}
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
  );
}



