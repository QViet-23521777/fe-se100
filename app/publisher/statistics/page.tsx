"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/app/context/AuthContext";
import { gameStoreApiUrl } from "@/lib/game-store-api";
import { PublisherAccountSidebar } from "@/components/PublisherAccountSidebar";

type KeyStats = { available: number; sold: number; reserved: number; total: number };
type RevenuePoint = { period: string; revenue: number };

type StatisticsResponse = {
  range: { from: string; to: string };
  totals: {
    games: number;
    orders: number;
    revenue: number;
    unitsSold: number;
    keys: KeyStats;
  };
  revenue: {
    byDay: RevenuePoint[];
    byMonth: RevenuePoint[];
    byYear: RevenuePoint[];
  };
  topGames: Array<{ gameId: string; name: string; revenue: number; unitsSold: number }>;
  perGame: Array<{
    gameId: string;
    name: string;
    revenue: number;
    unitsSold: number;
    keys: KeyStats;
  }>;
};

export default function PublisherStatisticsPage() {
  const { user, token } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<StatisticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!token || user?.accountType !== "publisher") {
      router.replace("/publisher/login");
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
  }, [router, token, user?.accountType]);

  const revenue30d = useMemo(() => data?.totals?.revenue ?? 0, [data?.totals?.revenue]);

  return (
    <div className="min-h-screen w-full bg-[#070f2b] text-white -mx-5 sm:-mx-10">
      <div className="flex w-full flex-col gap-12 px-5 pb-16 pt-6 sm:px-8 lg:px-10">
        <TopBar />

        <div className="grid gap-10 lg:grid-cols-[360px_1fr]">
          <PublisherAccountSidebar />

          <main className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-black/20 p-8 shadow-2xl backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Statistics</p>
            <h1 className="mt-2 text-3xl font-semibold">Revenue & sales</h1>
            <p className="mt-2 text-sm text-white/60">Based on completed orders within the selected date range.</p>

            {loading ? <div className="mt-8 text-white/70">Loading...</div> : null}
            {err ? (
              <div className="mt-8 rounded-2xl border border-red-500/40 bg-red-500/10 px-5 py-4 text-sm text-red-100">{err}</div>
            ) : null}

            {!loading && !err && data ? (
              <>
                <section className="mt-8 grid gap-4 sm:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-[#0c143d]/60 p-5">
                    <p className="text-sm text-white/60">Revenue</p>
                    <p className="mt-1 text-2xl font-semibold">${revenue30d.toFixed(2)}</p>
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
                    <p className="text-sm text-white/60">Keys sold</p>
                    <p className="mt-1 text-2xl font-semibold">{data.totals.keys.sold}</p>
                  </div>
                </section>

                {data.topGames?.length ? (
                  <section className="mt-6 rounded-2xl border border-white/10 bg-[#0c143d]/60 p-6">
                    <p className="text-lg font-semibold">Top games</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {data.topGames.slice(0, 6).map((g) => (
                        <div key={g.gameId} className="rounded-xl bg-white/5 px-4 py-3">
                          <p className="text-sm font-semibold">{g.name}</p>
                          <p className="mt-1 text-xs text-white/60">
                            Revenue: ${g.revenue.toFixed(2)} · Units: {g.unitsSold}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}

                <section className="mt-6 rounded-2xl border border-white/10 bg-[#0c143d]/60 p-6">
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-semibold">Per-game breakdown</p>
                    <p className="text-xs text-white/60">{data.perGame.length} games</p>
                  </div>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[780px] text-left text-sm">
                      <thead className="text-white/70">
                        <tr className="border-b border-white/10">
                          <th className="py-2 pr-4">Game</th>
                          <th className="py-2 pr-4">Revenue</th>
                          <th className="py-2 pr-4">Units</th>
                          <th className="py-2 pr-4">Keys (A/S/R)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.perGame.map((g) => (
                          <tr key={g.gameId} className="border-b border-white/5">
                            <td className="py-3 pr-4 font-semibold">{g.name}</td>
                            <td className="py-3 pr-4">${g.revenue.toFixed(2)}</td>
                            <td className="py-3 pr-4">{g.unitsSold}</td>
                            <td className="py-3 pr-4">
                              {g.keys.available}/{g.keys.sold}/{g.keys.reserved}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            ) : null}
          </main>
        </div>
      </div>
    </div>
  );
}

