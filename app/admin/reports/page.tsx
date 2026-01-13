"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/app/context/AuthContext";
import { gameStoreApiUrl } from "@/lib/game-store-api";

type Message = { type: "error" | "success"; text: string } | null;

type SidebarLink = { key: string; title: string; subtitle: string; href: string };

type Report = {
  id: string;
  reporterAccountType: "customer" | "publisher";
  reporterId: string;
  targetType: "game" | "review";
  targetId: string;
  targetGameType?: "steam" | "custom";
  reasonCategory?: string;
  reasonText: string;
  status: "Pending" | "Resolved" | "Rejected";
  resolutionNote?: string;
  createdAt?: string;
  updatedAt?: string;
  resolvedAt?: string;
  metadata?: Record<string, any>;
};

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

function Badge({ children }: { children: string }) {
  const cls =
    children === "Pending"
      ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-100"
      : children === "Resolved"
      ? "border-green-500/40 bg-green-500/10 text-green-100"
      : "border-red-500/40 bg-red-500/10 text-red-100";
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${cls}`}>{children}</span>;
}

export default function ReportsManagementPage() {
  const router = useRouter();
  const { user, token } = useAuth();

  const isAdmin = user?.accountType === "admin";

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<Message>(null);

  const [status, setStatus] = useState<string>("Pending");
  const [targetType, setTargetType] = useState<string>("");
  const [query, setQuery] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

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
      { key: "manage-promos", title: "Manage Promo Codes", subtitle: "Create and manage promotions", href: "/user/manage-promos" },
      { key: "manage-orders", title: "Manage Orders", subtitle: "View customer purchases", href: "/user/manage-orders" },
      { key: "manage-refunds", title: "Manage Refunds", subtitle: "Review and process refunds", href: "/user/manage-refunds" },
      { key: "manage-reviews", title: "Manage Reviews", subtitle: "Moderate customer reviews", href: "/user/manage-reviews" },
      { key: "manage-reports", title: "Manage Reports", subtitle: "Moderate reported content", href: "/user/manage-reports" },
    ],
    []
  );

  async function loadReports() {
    if (!token) return;
    setLoading(true);
    setMsg(null);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (targetType) params.set("targetType", targetType);
      const res = await fetch(gameStoreApiUrl(`/admin/reports?${params.toString()}`), {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || `Failed to load reports (HTTP ${res.status}).`);
      const list = Array.isArray(data) ? (data as Report[]) : [];
      setReports(list);
    } catch (err) {
      setReports([]);
      setMsg({ type: "error", text: err instanceof Error ? err.message : "Failed to load reports." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token || !isAdmin) return;
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isAdmin, status, targetType]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return reports;
    return reports.filter((r) => {
      const metaName = String(r.metadata?.gameName ?? r.metadata?.reviewSnippet ?? "");
      const hay = [
        r.targetType,
        r.targetId,
        r.targetGameType ?? "",
        r.reporterAccountType,
        r.reasonCategory ?? "",
        r.reasonText,
        metaName,
        r.status,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [query, reports]);

  async function updateStatus(id: string, nextStatus: "Pending" | "Resolved" | "Rejected") {
    if (!token) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(gameStoreApiUrl(`/admin/reports/${id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: nextStatus, resolutionNote: note || undefined }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || `Failed to update report (HTTP ${res.status}).`);
      setMsg({ type: "success", text: "Report updated." });
      setEditingId(null);
      setNote("");
      await loadReports();
    } catch (err) {
      setMsg({ type: "error", text: err instanceof Error ? err.message : "Failed to update report." });
    } finally {
      setSaving(false);
    }
  }

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
                <SidebarItem key={link.key} item={link} active={link.key === "manage-reports"} />
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
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-3xl font-semibold">Reports</h1>
                <p className="mt-1 text-white/70">Moderate reported games and reviews.</p>
              </div>
              <button
                type="button"
                onClick={loadReports}
                className="w-fit rounded-full border border-white/20 bg-white/5 px-5 py-2 text-sm font-semibold text-white hover:bg-white/10"
              >
                Refresh
              </button>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-4">
              <div className="lg:col-span-2">
                <label className="text-sm text-white/70">Search</label>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by reason, game, type…"
                  className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-white/30"
                />
              </div>
              <div>
                <label className="text-sm text-white/70">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-white/30"
                >
                  <option value="" className="bg-[#0c143d]">
                    All
                  </option>
                  <option value="Pending" className="bg-[#0c143d]">
                    Pending
                  </option>
                  <option value="Resolved" className="bg-[#0c143d]">
                    Resolved
                  </option>
                  <option value="Rejected" className="bg-[#0c143d]">
                    Rejected
                  </option>
                </select>
              </div>
              <div>
                <label className="text-sm text-white/70">Target</label>
                <select
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value)}
                  className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-white/30"
                >
                  <option value="" className="bg-[#0c143d]">
                    All
                  </option>
                  <option value="game" className="bg-[#0c143d]">
                    Game
                  </option>
                  <option value="review" className="bg-[#0c143d]">
                    Review
                  </option>
                </select>
              </div>
            </div>

            {msg ? (
              <div
                className={`mt-5 rounded-xl border px-4 py-3 text-sm ${
                  msg.type === "success"
                    ? "border-green-500/40 bg-green-500/10 text-green-200"
                    : "border-red-500/40 bg-red-500/10 text-red-200"
                }`}
              >
                {msg.text}
              </div>
            ) : null}

            <div className="mt-6">
              {loading ? (
                <p className="text-sm text-white/70">Loading…</p>
              ) : filtered.length === 0 ? (
                <p className="text-sm text-white/70">No reports found.</p>
              ) : (
                <div className="space-y-4">
                  {filtered.map((r) => {
                    const metaName = r.targetType === "game" ? r.metadata?.gameName : r.metadata?.reviewSnippet;
                    const created = r.createdAt || r.updatedAt;
                    return (
                      <div key={r.id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge>{r.status}</Badge>
                              <span className="text-xs text-white/60">
                                {r.reporterAccountType} • {r.targetType}
                                {r.targetType === "game" && r.targetGameType ? ` (${r.targetGameType})` : ""}
                              </span>
                            </div>
                            <p className="text-lg font-semibold text-white">
                              {metaName ? String(metaName) : r.targetType === "game" ? "Reported game" : "Reported review"}
                            </p>
                            <p className="text-sm text-white/70">
                              Target ID: <span className="text-white/85">{r.targetId}</span>
                            </p>
                            {created ? (
                              <p className="text-xs text-white/50">
                                Created: {new Date(created as any).toLocaleString()}
                              </p>
                            ) : null}
                          </div>

                          <div className="flex flex-col gap-2 sm:items-end">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(r.id);
                                setNote(r.resolutionNote || "");
                              }}
                              className="w-fit rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10"
                            >
                              {editingId === r.id ? "Editing…" : "Resolve / Reject"}
                            </button>
                          </div>
                        </div>

                        <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
                          <p className="text-xs text-white/60">{r.reasonCategory || "Other"}</p>
                          <p className="mt-2 whitespace-pre-line text-sm text-white/85">{r.reasonText}</p>
                        </div>

                        {editingId === r.id ? (
                          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                            <label className="text-sm text-white/70">Resolution note (optional)</label>
                            <textarea
                              value={note}
                              onChange={(e) => setNote(e.target.value)}
                              rows={3}
                              maxLength={2000}
                              className="mt-2 w-full resize-none rounded-xl bg-white/10 px-3 py-2 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-white/30"
                            />
                            <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => updateStatus(r.id, "Rejected")}
                                className="rounded-full border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-100 hover:bg-red-500/15 disabled:opacity-60"
                              >
                                Reject
                              </button>
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => updateStatus(r.id, "Resolved")}
                                className="rounded-full border border-green-500/40 bg-green-500/10 px-4 py-2 text-sm font-semibold text-green-100 hover:bg-green-500/15 disabled:opacity-60"
                              >
                                Resolve
                              </button>
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => updateStatus(r.id, "Pending")}
                                className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-60"
                              >
                                Set Pending
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingId(null);
                                  setNote("");
                                }}
                                className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

