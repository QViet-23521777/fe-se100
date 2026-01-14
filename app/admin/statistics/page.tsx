"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/app/context/AuthContext";
import { gameStoreApiUrl } from "@/lib/game-store-api";

type KeyStats = { available: number; sold: number; reserved: number; total: number };

type StatisticsResponse = {
  totals: {
    games: number;
    orders: number;
    revenue: number;
    unitsSold: number;
    keys: KeyStats;
    customers?: number;
  };
  topGames: Array<{ gameId: string; name: string; publisherName?: string; revenue: number; unitsSold: number }>;
  topPublishers: Array<{ publisherId: string; publisherName?: string; revenue: number; unitsSold: number; games: number }>;
};

export default function AdminStatisticsPage() {
  const { user, token } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<StatisticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const isAdmin = user?.accountType === "admin";
  const allowDevSeed = process.env.NEXT_PUBLIC_ALLOW_DEV_SEED === "true";
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedMsg, setSeedMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !isAdmin) {
      router.replace("/admin/login");
      return;
    }
    let active = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(gameStoreApiUrl("/statistics/summary"), {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.message || "Failed to load statistics");
        if (!active) return;
        setData(json);
      } catch (e) {
        if (!active) return;
        setErr(e instanceof Error ? e.message : "Failed to load statistics");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [isAdmin, router, token]);

  const revenueLabel = useMemo(() => `$${(data?.totals?.revenue ?? 0).toFixed(2)}`, [data?.totals?.revenue]);

  async function seedDemo() {
    if (!allowDevSeed || !token) return;
    setSeedLoading(true);
    setSeedMsg(null);
    setErr(null);
    try {
      const res = await fetch(gameStoreApiUrl("/dev/seed/admin-statistics"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "Failed to seed demo data");
      setSeedMsg("Demo data created. Refreshing...");
      const res2 = await fetch(gameStoreApiUrl("/statistics/summary"), {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const json2 = await res2.json().catch(() => null);
      if (res2.ok) setData(json2);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to seed demo data");
    } finally {
      setSeedLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#070f2b] text-white -mx-5 sm:-mx-10">
      <div className="flex w-full flex-col gap-12 px-5 pb-16 pt-6 sm:px-8 lg:px-10">
        <TopBar />

        <main className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-black/20 p-8 shadow-2xl backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Admin</p>
          <h1 className="mt-2 text-3xl font-semibold">Statistics & reports</h1>
          <p className="mt-2 text-sm text-white/60">Global revenue and sales across all publishers (completed orders).</p>

          {allowDevSeed ? (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={seedDemo}
                disabled={seedLoading}
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#1b1a55] disabled:opacity-60"
              >
                {seedLoading ? "Seeding..." : "Seed demo data"}
              </button>
              {seedMsg ? <span className="text-sm text-white/70">{seedMsg}</span> : null}
            </div>
          ) : null}

          {loading ? <div className="mt-8 text-white/70">Loading...</div> : null}
          {err ? (
            <div className="mt-8 rounded-2xl border border-red-500/40 bg-red-500/10 px-5 py-4 text-sm text-red-100">{err}</div>
          ) : null}

          {!loading && !err && data ? (
            <>
              <section className="mt-8 grid gap-4 sm:grid-cols-5">
                <div className="rounded-2xl border border-white/10 bg-[#0c143d]/60 p-5">
                  <p className="text-sm text-white/60">Revenue</p>
                  <p className="mt-1 text-2xl font-semibold">{revenueLabel}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#0c143d]/60 p-5">
                  <p className="text-sm text-white/60">Orders</p>
                  <p className="mt-1 text-2xl font-semibold">{data.totals.orders}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#0c143d]/60 p-5">
                  <p className="text-sm text-white/60">Units sold</p>
                  <p className="mt-1 text-2xl font-semibold">{data.totals.unitsSold}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#0c143d]/60 p-5">
                  <p className="text-sm text-white/60">Games</p>
                  <p className="mt-1 text-2xl font-semibold">{data.totals.games}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#0c143d]/60 p-5">
                  <p className="text-sm text-white/60">Customers</p>
                  <p className="mt-1 text-2xl font-semibold">{data.totals.customers ?? 0}</p>
                </div>
              </section>

              <section className="mt-6 grid gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-[#0c143d]/60 p-6">
                  <p className="text-lg font-semibold">Top publishers</p>
                  <div className="mt-4 space-y-3">
                    {data.topPublishers.slice(0, 10).map((p) => (
                      <div key={p.publisherId} className="rounded-xl bg-white/5 px-4 py-3">
                        <p className="text-sm font-semibold">{p.publisherName || p.publisherId}</p>
                        <p className="mt-1 text-xs text-white/60">
                          Revenue: ${p.revenue.toFixed(2)} · Units: {p.unitsSold} · Games: {p.games}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#0c143d]/60 p-6">
                  <p className="text-lg font-semibold">Top games</p>
                  <div className="mt-4 space-y-3">
                    {data.topGames.slice(0, 10).map((g) => (
                      <div key={g.gameId} className="rounded-xl bg-white/5 px-4 py-3">
                        <p className="text-sm font-semibold">{g.name}</p>
                        <p className="mt-1 text-xs text-white/60">
                          Publisher: {g.publisherName || "—"} · Revenue: ${g.revenue.toFixed(2)} · Units: {g.unitsSold}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </>
          ) : null}
        </main>
      </div>
    </div>
  );
}
