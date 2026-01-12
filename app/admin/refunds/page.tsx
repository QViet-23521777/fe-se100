"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/app/context/AuthContext";
import { gameStoreApiUrl } from "@/lib/game-store-api";

type Message = { type: "error" | "success"; text: string } | null;

type SidebarLink = { key: string; title: string; subtitle: string; href: string };

type RefundRequest = {
  id: string;
  orderId: string;
  customerId: string;
  status: "Pending" | "Approved" | "Rejected" | string;
  reason?: string;
  requestedAt?: string;
  resolvedAt?: string;
  resolutionNote?: string;
  processedByAdminId?: string;
  order?: {
    id?: string;
    orderDate?: string;
    totalValue?: number;
    paymentStatus?: string;
    promoCode?: string;
    promoDiscountValue?: number;
  };
  customer?: {
    id?: string;
    email?: string;
    name?: string;
  };
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

function formatUsd(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return `$${value.toFixed(2)}`;
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function statusPill(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "approved") return "border-emerald-400/30 bg-emerald-500/10 text-emerald-100";
  if (normalized === "rejected") return "border-rose-400/30 bg-rose-500/10 text-rose-100";
  return "border-white/15 bg-white/5 text-white/80";
}

export default function AdminRefundsPage() {
  const router = useRouter();
  const { user, token } = useAuth();

  const isAdmin = user?.accountType === "admin";

  const [requests, setRequests] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [listMsg, setListMsg] = useState<Message>(null);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Pending" | "Approved" | "Rejected">("Pending");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [detailsMsg, setDetailsMsg] = useState<Message>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [savingDecision, setSavingDecision] = useState(false);

  useEffect(() => {
    if (!token || !isAdmin) {
      router.replace(`/user/login?next=${encodeURIComponent("/user/manage-refunds")}`);
    }
  }, [isAdmin, router, token]);

  const sidebarLinks: SidebarLink[] = [
    { key: "personal", title: "Personal Information", subtitle: "Modify your personal information", href: "/user/profile" },
    { key: "manage-accounts", title: "Manage Accounts", subtitle: "Create or edit admin/publisher accounts", href: "/user/manage-accounts" },
    { key: "manage-games", title: "Manage Games", subtitle: "Create or edit games", href: "/user/manage-games" },
    { key: "manage-promos", title: "Manage Promo Codes", subtitle: "Create and manage promotions", href: "/user/manage-promos" },
    { key: "manage-orders", title: "Manage Orders", subtitle: "View customer purchases", href: "/user/manage-orders" },
    { key: "manage-refunds", title: "Manage Refunds", subtitle: "Review and process refunds", href: "/user/manage-refunds" },
    { key: "manage-reviews", title: "Manage Reviews", subtitle: "Moderate customer reviews", href: "/user/manage-reviews" },
  ];

  const loadRequests = async () => {
    if (!token) return;
    setLoading(true);
    setListMsg(null);
    try {
      const qs = statusFilter === "All" ? "" : `?status=${encodeURIComponent(statusFilter)}`;
      const res = await fetch(gameStoreApiUrl(`/admin/refund-requests${qs}`), {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Failed to load refund requests.");
      const next = Array.isArray(data) ? (data as RefundRequest[]) : [];
      setRequests(next);
      if (!selectedId && next.length > 0) setSelectedId(next[0].id);
    } catch (err) {
      setListMsg({ type: "error", text: err instanceof Error ? err.message : "Failed to load refund requests." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, statusFilter]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter((r) => {
      const hay = [
        r.id,
        r.status,
        r.orderId,
        r.customerId,
        r.customer?.email,
        r.customer?.name,
        r.reason,
        r.resolutionNote,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [query, requests]);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    return requests.find((r) => r.id === selectedId) ?? null;
  }, [requests, selectedId]);

  const approve = async () => {
    if (!token || !selected) return;
    setSavingDecision(true);
    setDetailsMsg(null);
    try {
      const res = await fetch(
        gameStoreApiUrl(`/admin/refund-requests/${encodeURIComponent(selected.id)}/approve`),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ note: decisionNote.trim() || undefined }),
        }
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Failed to approve refund request.");
      setDetailsMsg({ type: "success", text: "Refund approved and processed." });
      setDecisionNote("");
      await loadRequests();
    } catch (err) {
      setDetailsMsg({ type: "error", text: err instanceof Error ? err.message : "Failed to approve refund request." });
    } finally {
      setSavingDecision(false);
    }
  };

  const reject = async () => {
    if (!token || !selected) return;
    const note = decisionNote.trim();
    if (!note) {
      setDetailsMsg({ type: "error", text: "Rejection note is required." });
      return;
    }
    setSavingDecision(true);
    setDetailsMsg(null);
    try {
      const res = await fetch(
        gameStoreApiUrl(`/admin/refund-requests/${encodeURIComponent(selected.id)}/reject`),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ note }),
        }
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Failed to reject refund request.");
      setDetailsMsg({ type: "success", text: "Refund request rejected." });
      setDecisionNote("");
      await loadRequests();
    } catch (err) {
      setDetailsMsg({ type: "error", text: err instanceof Error ? err.message : "Failed to reject refund request." });
    } finally {
      setSavingDecision(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#070f2b] text-white -mx-5 sm:-mx-10">
      <div className="flex w-full flex-col gap-12 px-5 pb-16 pt-6 sm:px-8 lg:px-10">
        <TopBar />

        <div className="grid gap-10 lg:grid-cols-[360px_1fr]">
          <aside className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-black/20 shadow-2xl backdrop-blur">
            <div className="bg-white/10 px-6 py-6">
              <p className="text-2xl font-semibold">My Account</p>
              <p className="mt-1 text-sm text-white/60">Account Management</p>
            </div>
            <div className="divide-y divide-white/10">
              {sidebarLinks.map((item) => (
                <SidebarItem key={item.key} item={item} active={item.key === "manage-refunds"} />
              ))}
            </div>
            <div className="px-6 py-6">
              <button
                type="button"
                onClick={() => router.push("/user/logout")}
                className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Log out
              </button>
            </div>
          </aside>

          <main className="rounded-3xl border border-white/10 bg-[#0c143d]/70 p-6 shadow-xl">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h1 className="text-3xl font-semibold">Refund Requests</h1>
                <p className="mt-1 text-sm text-white/70">
                  Approving a request refunds the order and credits the customer account balance.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="h-11 rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                >
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                  <option value="All">All</option>
                </select>
                <button
                  type="button"
                  onClick={loadRequests}
                  className="rounded-full border border-white/20 bg-white/5 px-5 py-2 text-sm font-semibold text-white hover:bg-white/10"
                >
                  Refresh
                </button>
              </div>
            </div>

            {listMsg ? (
              <div
                className={`mt-6 rounded-2xl border p-4 ${
                  listMsg.type === "error"
                    ? "border-red-400/30 bg-red-500/10 text-red-100"
                    : "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                }`}
              >
                {listMsg.text}
              </div>
            ) : null}

            <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1.2fr]">
              <section className="rounded-3xl border border-white/10 bg-black/10 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-lg font-semibold">All Requests</p>
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by id, email, order…"
                    className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/20 sm:w-[300px]"
                  />
                </div>

                <div className="mt-4 max-h-[560px] overflow-auto pr-1">
                  {loading ? (
                    <p className="py-10 text-center text-sm text-white/70">Loadingƒ?İ</p>
                  ) : filtered.length === 0 ? (
                    <p className="py-10 text-center text-sm text-white/70">No refund requests found.</p>
                  ) : (
                    <div className="space-y-3">
                      {filtered.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setSelectedId(r.id)}
                          className={`w-full rounded-2xl border p-4 text-left transition ${
                            selectedId === r.id
                              ? "border-white/30 bg-white/10"
                              : "border-white/10 bg-white/5 hover:border-white/20"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-white">
                                Order: <span className="font-mono">{r.orderId}</span>
                              </p>
                              <p className="text-xs text-white/60">
                                {r.customer?.email || r.customerId}
                              </p>
                            </div>
                            <span className={`rounded-full border px-3 py-1 text-xs ${statusPill(r.status)}`}>
                              {r.status}
                            </span>
                          </div>
                          {r.reason ? (
                            <p className="mt-2 line-clamp-2 text-xs text-white/70">{r.reason}</p>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-3xl border border-white/10 bg-black/10 p-5">
                {!selected ? (
                  <p className="py-10 text-center text-sm text-white/70">Select a refund request.</p>
                ) : (
                  <div className="space-y-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-xs text-white/60">Request</p>
                        <p className="mt-1 font-mono text-sm text-white/90">{selected.id}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className={`rounded-full border px-3 py-1 text-xs ${statusPill(selected.status)}`}>
                            {selected.status}
                          </span>
                          {selected.order?.paymentStatus ? (
                            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/80">
                              Order status:{" "}
                              <span className="font-semibold text-white">{selected.order.paymentStatus}</span>
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <Link
                        href="/user/manage-orders"
                        className="rounded-full border border-white/20 bg-white/5 px-5 py-2 text-sm font-semibold text-white hover:bg-white/10"
                      >
                        View Orders
                      </Link>
                    </div>

                    <div className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-white/60">Customer</p>
                        <p className="mt-1 font-semibold text-white">
                          {selected.customer?.email || selected.customerId}
                        </p>
                        {selected.customer?.name ? (
                          <p className="mt-1 text-xs text-white/60">{selected.customer.name}</p>
                        ) : null}
                      </div>
                      <div>
                        <p className="text-xs text-white/60">Order Total</p>
                        <p className="mt-1 font-semibold text-white">
                          {formatUsd(selected.order?.totalValue)}
                        </p>
                        <p className="mt-1 text-xs text-white/60">
                          Order date: {formatDate(selected.order?.orderDate)}
                        </p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-xs text-white/60">Reason</p>
                        <p className="mt-1 text-white/85">{selected.reason || "—"}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-xs text-white/60">Resolution note</p>
                        <p className="mt-1 text-white/85">{selected.resolutionNote || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-white/60">Requested</p>
                        <p className="mt-1 text-white/85">{formatDate(selected.requestedAt)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-white/60">Resolved</p>
                        <p className="mt-1 text-white/85">{formatDate(selected.resolvedAt)}</p>
                      </div>
                    </div>

                    {detailsMsg ? (
                      <div
                        className={`rounded-2xl border p-4 text-sm ${
                          detailsMsg.type === "error"
                            ? "border-red-400/30 bg-red-500/10 text-red-100"
                            : "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                        }`}
                      >
                        {detailsMsg.text}
                      </div>
                    ) : null}

                    {String(selected.status).toLowerCase() === "pending" ? (
                      <div className="space-y-3">
                        <label className="block text-sm font-semibold text-white">
                          Admin note (optional for approve, required for reject)
                        </label>
                        <textarea
                          value={decisionNote}
                          onChange={(e) => setDecisionNote(e.target.value)}
                          rows={3}
                          maxLength={500}
                          className="w-full resize-none rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                          placeholder="Add a note…"
                        />
                        <div className="flex flex-wrap justify-end gap-3">
                          <button
                            type="button"
                            onClick={reject}
                            disabled={savingDecision}
                            className="rounded-full border border-rose-400/40 bg-rose-500/10 px-6 py-2 text-sm font-semibold text-rose-100 hover:bg-rose-500/15 disabled:opacity-70"
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            onClick={approve}
                            disabled={savingDecision}
                            className="rounded-full bg-white px-6 py-2 text-sm font-semibold text-[#1b1a55] disabled:opacity-70"
                          >
                            {savingDecision ? "Saving…" : "Approve & Refund"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-white/60">This request is already resolved.</p>
                    )}
                  </div>
                )}
              </section>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
