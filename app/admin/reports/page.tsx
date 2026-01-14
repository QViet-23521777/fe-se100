"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/app/context/AuthContext";
import { gameStoreApiUrl } from "@/lib/game-store-api";

type SidebarLink = { key: string; title: string; subtitle: string; href: string };
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
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
  resolvedAt?: string;
  resolvedByAdminId?: string;
  resolutionNote?: string;
};

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

function formatDate(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d.toLocaleString() : "—";
}

export default function AdminReportsPage() {
  const router = useRouter();
  const { user, token, logout } = useAuth();

  const isAdmin = user?.accountType === "admin";

  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<Message>(null);

  const [status, setStatus] = useState<string>("Pending");
  const [targetType, setTargetType] = useState<string>("");

  const [selected, setSelected] = useState<ReportRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detailStatus, setDetailStatus] = useState<ReportRow["status"]>("Pending");
  const [detailNote, setDetailNote] = useState("");
  const [detailMsg, setDetailMsg] = useState<Message>(null);

  useEffect(() => {
    if (!token || !isAdmin) {
      router.replace(`/user/login?next=${encodeURIComponent("/user/manage-reports")}`);
    }
  }, [isAdmin, router, token]);

  const sidebarLinks: SidebarLink[] = useMemo(
    () => [
      { key: "personal", title: "Personal Information", subtitle: "Modify your personal information", href: "/user/profile" },
      { key: "manage-accounts", title: "Manage Accounts", subtitle: "Create or edit admin/publisher accounts", href: "/user/manage-accounts" },
      { key: "manage-games", title: "Manage Games", subtitle: "Create or edit games", href: "/user/manage-games" },
      { key: "manage-promos", title: "Game Sale", subtitle: "Create and manage promo codes", href: "/user/manage-promos" },
      { key: "manage-orders", title: "Manage Orders", subtitle: "View customer purchases", href: "/user/manage-orders" },
      { key: "manage-refunds", title: "Manage Refunds", subtitle: "Review and process refunds", href: "/user/manage-refunds" },
      { key: "manage-reports", title: "Manage Reports", subtitle: "Review reported items", href: "/user/manage-reports" },
    ],
    []
  );

  const loadReports = async () => {
    if (!token || !isAdmin) return;
    setLoading(true);
    setMsg(null);
    try {
      const sp = new URLSearchParams();
      if (status) sp.set("status", status);
      if (targetType) sp.set("targetType", targetType);
      sp.set("limit", "200");

      const url = gameStoreApiUrl(`/admin/reports?${sp.toString()}`);
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
    void loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isAdmin]);

  useEffect(() => {
    if (!token || !isAdmin) return;
    void loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, targetType]);

  const openDetail = (report: ReportRow) => {
    setSelected(report);
    setDetailStatus(report.status);
    setDetailNote(report.resolutionNote ?? "");
    setDetailMsg(null);
    setDetailOpen(true);
  };

  const closeDetail = () => {
    if (saving) return;
    setDetailOpen(false);
    setSelected(null);
    setDetailMsg(null);
  };

  const saveDetail = async () => {
    if (!token || !selected) return;
    setSaving(true);
    setDetailMsg(null);
    try {
      const res = await fetch(gameStoreApiUrl(`/admin/reports/${selected.id}`), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: detailStatus, resolutionNote: detailNote.trim() ? detailNote.trim() : undefined }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Failed to update report");
      setDetailMsg({ type: "success", text: "Report updated." });
      await loadReports();
      setSelected(data as ReportRow);
    } catch (err) {
      setDetailMsg({ type: "error", text: err instanceof Error ? err.message : "Failed to update report" });
    } finally {
      setSaving(false);
    }
  };

  if (!token || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#070f2b] text-white -mx-5 sm:-mx-10">
        <div className="flex w-full flex-col gap-8 px-5 pb-16 pt-6 sm:px-8 lg:px-10">
          <TopBar />
          <div className="mx-auto w-full max-w-xl rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-black/20 p-8 text-center shadow-2xl backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Manage Reports</p>
            <h1 className="mt-2 text-2xl font-semibold">Access denied</h1>
            <p className="mt-3 text-sm text-white/70">Admin access required.</p>
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
                  router.push("/user/login?next=/user/manage-reports");
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

  return (
    <div className="min-h-screen bg-[#070f2b] text-white -mx-5 sm:-mx-10">
      <div className="flex w-full flex-col gap-8 px-5 pb-16 pt-6 sm:px-8 lg:px-10">
        <TopBar />

        <div className="grid gap-10 lg:grid-cols-[360px_1fr]">
          <aside className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-black/20 shadow-2xl backdrop-blur">
            <div className="bg-white/10 px-6 py-6">
              <p className="text-2xl font-semibold">My Account</p>
              <p className="mt-1 text-sm text-white/60">Admin Management</p>
            </div>
            <div className="divide-y divide-white/10">
              {sidebarLinks.map((item) => (
                <SidebarItem key={item.key} item={item} active={item.key === "manage-reports"} />
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

          <main className="rounded-3xl border border-white/10 bg-[#0c143d]/70 p-8 shadow-2xl backdrop-blur">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Manage Reports</p>
                <h1 className="mt-2 text-2xl font-semibold">Reports</h1>
                <p className="mt-2 text-sm text-white/60">Review and resolve reported items.</p>
              </div>
              <button
                type="button"
                onClick={() => void loadReports()}
                disabled={loading}
                className={`rounded-full border border-white/25 px-5 py-2 text-sm font-semibold text-white ${
                  loading ? "opacity-60" : "hover:bg-white/10"
                }`}
              >
                {loading ? "Loading…" : "Refresh"}
              </button>
            </div>

            <div className="mt-6 grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 sm:grid-cols-2">
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
              <div>
                <label className="text-sm font-semibold text-white/80">Target Type</label>
                <select
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none [color-scheme:dark]"
                >
                  <option value="">All</option>
                  <option value="game">Game</option>
                  <option value="review">Review</option>
                </select>
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
                      <th className="px-4 py-3 text-left font-semibold">Status</th>
                      <th className="px-4 py-3 text-left font-semibold">Target</th>
                      <th className="px-4 py-3 text-left font-semibold">Reporter</th>
                      <th className="px-4 py-3 text-left font-semibold">Category</th>
                      <th className="px-4 py-3 text-left font-semibold">Created</th>
                      <th className="px-4 py-3 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {reports.length === 0 ? (
                      <tr>
                        <td className="px-4 py-6 text-white/70" colSpan={6}>
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
                            <div className="mt-1 text-xs text-white/60">
                              {r.metadata?.gameName || r.metadata?.reviewGameId || r.targetId}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-white/75">
                            <div className="font-semibold text-white">{r.reporterAccountType}</div>
                            <div className="mt-1 text-xs text-white/60">{r.reporterId}</div>
                          </td>
                          <td className="px-4 py-4 text-white/70">{r.reasonCategory || "—"}</td>
                          <td className="px-4 py-4 text-white/70">{formatDate(r.createdAt)}</td>
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
        </div>
      </div>

      {detailOpen && selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-10">
          <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[#0c143d] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Report</p>
                <h2 className="mt-2 text-xl font-semibold">Report details</h2>
                <p className="mt-2 text-sm text-white/60 truncate">ID: {selected.id}</p>
              </div>
              <button
                type="button"
                onClick={closeDetail}
                disabled={saving}
                className={`rounded-full border border-white/25 px-4 py-2 text-sm font-semibold text-white ${
                  saving ? "opacity-60" : "hover:bg-white/10"
                }`}
              >
                Close
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:grid-cols-2">
                <div className="text-sm">
                  <div className="text-white/60">Status</div>
                  <div className="mt-1 font-semibold text-white">{selected.status}</div>
                </div>
                <div className="text-sm">
                  <div className="text-white/60">Target</div>
                  <div className="mt-1 font-semibold text-white">
                    {selected.targetType === "game"
                      ? `${selected.targetGameType === "steam" ? "Steam" : "Custom"} game`
                      : "Review"}
                  </div>
                  <div className="mt-1 text-xs text-white/60">{selected.targetId}</div>
                </div>
                <div className="text-sm">
                  <div className="text-white/60">Reporter</div>
                  <div className="mt-1 font-semibold text-white">{selected.reporterAccountType}</div>
                  <div className="mt-1 text-xs text-white/60">{selected.reporterId}</div>
                </div>
                <div className="text-sm">
                  <div className="text-white/60">Created</div>
                  <div className="mt-1 font-semibold text-white">{formatDate(selected.createdAt)}</div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white/80">Reason</p>
                  <p className="text-xs text-white/60">{selected.reasonCategory || "—"}</p>
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

              <div className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-white/80">Update status</label>
                  <select
                    value={detailStatus}
                    onChange={(e) => setDetailStatus(e.target.value as ReportRow["status"])}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none [color-scheme:dark]"
                    disabled={saving}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-white/80">Resolution note (optional)</label>
                  <textarea
                    value={detailNote}
                    onChange={(e) => setDetailNote(e.target.value)}
                    className="mt-2 h-[46px] w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
                    maxLength={2000}
                    disabled={saving}
                  />
                </div>
              </div>

              {detailMsg ? (
                <div
                  className={`rounded-2xl border p-4 text-sm ${
                    detailMsg.type === "error"
                      ? "border-red-500/40 bg-red-500/10 text-red-100"
                      : "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
                  }`}
                >
                  {detailMsg.text}
                </div>
              ) : null}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeDetail}
                  disabled={saving}
                  className={`rounded-full border border-white/25 px-5 py-2 text-sm font-semibold text-white ${
                    saving ? "opacity-60" : "hover:bg-white/10"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void saveDetail()}
                  disabled={saving}
                  className={`rounded-full bg-white px-5 py-2 text-sm font-semibold text-[#1b1a55] ${
                    saving ? "opacity-60" : "hover:bg-white/90"
                  }`}
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
