"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/app/context/AuthContext";
import { gameStoreApiUrl } from "@/lib/game-store-api";
import { PublisherAccountSidebar } from "@/components/PublisherAccountSidebar";

type Message = { type: "error" | "success"; text: string } | null;

type ReportRow = {
  id: string;
  reporterAccountType: "customer" | "publisher";
  reporterId: string;
  targetType: "game" | "review";
  targetId: string;
  targetGameType?: "steam" | "custom";
  reasonCategory?: string;
  reasonText: string;
  status: "Pending" | "Resolved" | "Rejected";
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
  resolvedAt?: string;
  resolutionNote?: string;
};

function formatDate(value?: string) {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d.toLocaleString() : "-";
}

export default function MyReportsPage() {
  const router = useRouter();
  const { user, token, logout } = useAuth();

  const isCustomer = user?.accountType === "customer";
  const isPublisher = user?.accountType === "publisher";
  const canAccess = Boolean(token && (isCustomer || isPublisher));

  const endpoint = useMemo(() => {
    if (isCustomer) return "/customers/me/reports";
    if (isPublisher) return "/publisher/me/reports";
    return null;
  }, [isCustomer, isPublisher]);

  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<Message>(null);
  const [status, setStatus] = useState<string>("");

  const [selected, setSelected] = useState<ReportRow | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!token) {
      router.replace(`/user/login?next=${encodeURIComponent("/user/reports")}`);
    }
  }, [router, token]);

  const load = async () => {
    if (!token || !endpoint) return;
    setLoading(true);
    setMsg(null);
    try {
      const sp = new URLSearchParams();
      if (status) sp.set("status", status);
      sp.set("limit", "200");
      const url = gameStoreApiUrl(`${endpoint}?${sp.toString()}`);
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Failed to load reports");
      setReports(Array.isArray(data) ? data : []);
    } catch (err) {
      setMsg({ type: "error", text: err instanceof Error ? err.message : "Failed to load reports" });
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, endpoint]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const openDetail = (r: ReportRow) => {
    setSelected(r);
    setOpen(true);
  };

  const closeDetail = () => {
    setOpen(false);
    setSelected(null);
  };

  if (!canAccess) {
    return (
      <div className="min-h-screen bg-[#070f2b] text-white -mx-5 sm:-mx-10">
        <div className="flex w-full flex-col gap-8 px-5 pb-16 pt-6 sm:px-8 lg:px-10">
          <TopBar />
          <div className="mx-auto w-full max-w-xl rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-black/20 p-8 text-center shadow-2xl backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/60">My Reports</p>
            <h1 className="mt-2 text-2xl font-semibold">Access denied</h1>
            <p className="mt-3 text-sm text-white/70">Log in with a customer or publisher account.</p>
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
                  router.push("/user/login?next=/user/reports");
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

  const content = (
    <main className="flex w-full flex-col gap-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">My Reports</h1>
          <p className="mt-2 text-sm text-white/70">Track the status of reports you submitted.</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className={`rounded-full border border-white/25 px-5 py-2 text-sm font-semibold text-white ${
            loading ? "opacity-60" : "hover:bg-white/10"
          }`}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <div className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-semibold text-white/80">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none [color-scheme:dark]"
          >
            <option value="">All</option>
            <option value="Pending">Pending</option>
            <option value="Resolved">Resolved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
        <div className="flex items-end">
          <p className="text-sm text-white/60">
            {reports.length} report{reports.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {msg ? (
        <div
          className={`rounded-2xl border p-4 text-sm ${
            msg.type === "error"
              ? "border-red-500/40 bg-red-500/10 text-red-100"
              : "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
          }`}
        >
          {msg.text}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-white/10">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10 text-sm">
            <thead className="bg-white/5 text-white/70">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Target</th>
                <th className="px-4 py-3 text-left font-semibold">Category</th>
                <th className="px-4 py-3 text-left font-semibold">Updated</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {reports.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-white/70" colSpan={5}>
                    {loading ? "Loading reports..." : "No reports found."}
                  </td>
                </tr>
              ) : (
                reports.map((r) => (
                  <tr key={r.id} className="bg-white/[0.02]">
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
                          r.status === "Pending"
                            ? "border-amber-400/40 bg-amber-500/10 text-amber-100"
                            : r.status === "Resolved"
                              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
                              : "border-red-500/40 bg-red-500/10 text-red-100"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-white/75">
                      <div className="font-semibold text-white">
                        {r.targetType === "game"
                          ? `${r.targetGameType === "steam" ? "Steam" : "Custom"} game`
                          : "Review"}
                      </div>
                      <div className="mt-1 text-xs text-white/60">{(r.metadata as any)?.gameName || r.targetId}</div>
                    </td>
                    <td className="px-4 py-4 text-white/70">{r.reasonCategory || "-"}</td>
                    <td className="px-4 py-4 text-white/70">{formatDate(r.updatedAt || r.createdAt)}</td>
                    <td className="px-4 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => openDetail(r)}
                        className="rounded-full border border-white/25 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );

  return (
    <div className="min-h-screen bg-[#070f2b] text-white -mx-5 sm:-mx-10">
      <div className="flex w-full flex-col gap-12 px-5 pb-16 pt-6 sm:px-8 lg:px-10">
        <TopBar />

        {isPublisher ? (
          <div className="grid gap-10 lg:grid-cols-[360px_1fr]">
            <PublisherAccountSidebar />
            {content}
          </div>
        ) : (
          content
        )}
      </div>

      {open && selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-10">
          <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[#0c143d] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Report</p>
                <h2 className="mt-2 text-xl font-semibold">Report details</h2>
                <p className="mt-2 truncate text-sm text-white/60">ID: {selected.id}</p>
              </div>
              <button
                type="button"
                onClick={closeDetail}
                className="rounded-full border border-white/25 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
              >
                Close
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:grid-cols-2">
                <div className="text-sm">
                  <div className="text-white/60">Status</div>
                  <div className="mt-1 font-semibold text-white">{selected.status}</div>
                  {selected.resolutionNote ? (
                    <p className="mt-2 text-xs text-white/70">Note: {selected.resolutionNote}</p>
                  ) : null}
                </div>
                <div className="text-sm">
                  <div className="text-white/60">Updated</div>
                  <div className="mt-1 font-semibold text-white">{formatDate(selected.updatedAt || selected.createdAt)}</div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white/80">Reason</p>
                  <p className="text-xs text-white/60">{selected.reasonCategory || "-"}</p>
                </div>
                <p className="mt-3 whitespace-pre-line text-sm text-white/80">{selected.reasonText}</p>
              </div>

              {selected.metadata ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm font-semibold text-white/80">Metadata</p>
                  <pre className="mt-3 max-h-56 overflow-auto rounded-xl bg-black/30 p-3 text-xs text-white/75">
                    {JSON.stringify(selected.metadata, null, 2)}
                  </pre>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

