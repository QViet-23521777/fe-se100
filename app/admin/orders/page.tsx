"use client";

import {useEffect, useMemo, useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {TopBar} from "@/components/TopBar";
import {useAuth} from "@/app/context/AuthContext";
import {gameStoreApiUrl} from "@/lib/game-store-api";

type Message = {type: "error" | "success"; text: string} | null;

type SidebarLink = {key: string; title: string; subtitle: string; href: string};

type OrderSummary = {
  id: string;
  orderDate?: string;
  totalValue?: number;
  paymentMethod?: string;
  transactionId?: string;
  paymentStatus?: "Pending" | "Completed" | "Failed" | "Refunded" | string;
  promoCode?: string;
  promoDiscountValue?: number;
  customer?: {id?: string; email?: string; name?: string};
  items?: Array<{
    steamAppId?: number;
    slug?: string;
    name: string;
    quantity: number;
    unitPriceCents: number;
    image?: string;
    keyCodes?: string[];
  }>;
  orderDetails?: Array<any>;
};

function formatUsd(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return `$${value.toFixed(2)}`;
}

function orderItemHref(item: {steamAppId?: number; slug?: string}, fallbackName: string) {
  if (typeof item.steamAppId === "number" && Number.isFinite(item.steamAppId)) {
    return `/product/${Math.floor(item.steamAppId)}`;
  }
  if (item.slug) {
    return /^[a-f0-9]{24}$/i.test(item.slug) ? `/product/game/${item.slug}` : `/product/${item.slug}`;
  }
  return `/browse?q=${encodeURIComponent(fallbackName)}`;
}

function SidebarItem({item, active}: {item: SidebarLink; active?: boolean}) {
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

export default function AdminOrdersPage() {
  const router = useRouter();
  const {user, token} = useAuth();

  const isAdmin = user?.accountType === "admin";

  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [listMsg, setListMsg] = useState<Message>(null);

  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [details, setDetails] = useState<OrderSummary | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsMsg, setDetailsMsg] = useState<Message>(null);

  const [statusDraft, setStatusDraft] = useState<NonNullable<OrderSummary["paymentStatus"]>>("Pending");
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<Message>(null);

  useEffect(() => {
    if (!token || !isAdmin) {
      router.replace(`/user/login?next=${encodeURIComponent("/user/manage-orders")}`);
    }
  }, [isAdmin, router, token]);

  const sidebarLinks: SidebarLink[] = [
    {key: "personal", title: "Personal Information", subtitle: "Modify your personal information", href: "/user/profile"},
    {key: "manage-accounts", title: "Manage Accounts", subtitle: "Create or edit admin/publisher accounts", href: "/user/manage-accounts"},
    {key: "manage-games", title: "Manage Games", subtitle: "Create or edit games", href: "/user/manage-games"},
    {key: "manage-promos", title: "Manage Promo Codes", subtitle: "Create and manage promotions", href: "/user/manage-promos"},
    {key: "manage-orders", title: "Manage Orders", subtitle: "View customer purchases", href: "/user/manage-orders"},
    {key: "manage-refunds", title: "Manage Refunds", subtitle: "Review and process refunds", href: "/user/manage-refunds"},
    {key: "manage-reviews", title: "Manage Reviews", subtitle: "Moderate customer reviews", href: "/user/manage-reviews"},
  ];

  const loadOrders = async () => {
    if (!token) return;
    setLoading(true);
    setListMsg(null);
    try {
      const res = await fetch(gameStoreApiUrl("/admin/orders"), {
        headers: {Authorization: `Bearer ${token}`},
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Failed to load orders.");
      const next = Array.isArray(data) ? (data as OrderSummary[]) : [];
      setOrders(next);
      if (!selectedId && next.length > 0) setSelectedId(next[0].id);
    } catch (err) {
      setListMsg({type: "error", text: err instanceof Error ? err.message : "Failed to load orders."});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!token || !selectedId) return;
    let active = true;
    setDetailsLoading(true);
    setDetailsMsg(null);
    setStatusMsg(null);
    void (async () => {
      try {
        const res = await fetch(gameStoreApiUrl(`/admin/orders/${encodeURIComponent(selectedId)}`), {
          headers: {Authorization: `Bearer ${token}`},
          cache: "no-store",
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.message || "Failed to load order details.");
        if (!active) return;
        setDetails(data as OrderSummary);
        setStatusDraft(((data as any)?.paymentStatus ?? "Pending") as any);
      } catch (err) {
        if (!active) return;
        setDetails(null);
        setDetailsMsg({
          type: "error",
          text: err instanceof Error ? err.message : "Failed to load order details.",
        });
      } finally {
        if (active) setDetailsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [selectedId, token]);

  const filteredOrders = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) => {
      const hay = [
        o.id,
        o.customer?.email,
        o.customer?.name,
        o.paymentStatus,
        o.transactionId,
        o.promoCode,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [orders, query]);

  const selectedSummary = useMemo(() => {
    if (!selectedId) return null;
    return orders.find((o) => o.id === selectedId) ?? null;
  }, [orders, selectedId]);

  const saveStatus = async () => {
    if (!token || !selectedId) return;
    setStatusSaving(true);
    setStatusMsg(null);
    try {
      const res = await fetch(gameStoreApiUrl(`/admin/orders/${encodeURIComponent(selectedId)}`), {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({paymentStatus: statusDraft}),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Failed to update order.");
      setStatusMsg({type: "success", text: "Order updated."});
      setDetails(data as OrderSummary);
      setOrders((prev) => prev.map((o) => (o.id === selectedId ? {...o, paymentStatus: (data as any)?.paymentStatus} : o)));
    } catch (err) {
      setStatusMsg({type: "error", text: err instanceof Error ? err.message : "Failed to update order."});
    } finally {
      setStatusSaving(false);
    }
  };

  const detailItems = useMemo(() => {
    const base = details ?? selectedSummary;
    if (!base) return [];

    if (Array.isArray(base.items) && base.items.length > 0) {
      return base.items.map((it, idx) => ({
        key: `${idx}-${it.name}`,
        name: it.name,
        quantity: it.quantity,
        unitPriceCents: it.unitPriceCents,
        totalCents: it.unitPriceCents * it.quantity,
        image: it.image,
        href: orderItemHref(it, it.name),
        keyCodes: it.keyCodes ?? [],
      }));
    }

    const detailsList = Array.isArray((base as any).orderDetails) ? ((base as any).orderDetails as any[]) : [];
    return detailsList.map((row, idx) => {
      const game = row?.game ?? {};
      const name = String(game?.name ?? "Game");
      const value = typeof row?.value === "number" && Number.isFinite(row.value) ? row.value : 0;
      const gameId = typeof game?.id === "string" ? game.id : "";
      const href = gameId ? `/product/game/${gameId}` : `/browse?q=${encodeURIComponent(name)}`;
      const image = String(game?.imageUrl ?? game?.image ?? "");
      const code = row?.gameKey?.keyCode ? [String(row.gameKey.keyCode)] : [];
      return {
        key: `${idx}-${row?.id ?? name}`,
        name,
        quantity: 1,
        unitPriceCents: Math.round(value * 100),
        totalCents: Math.round(value * 100),
        image,
        href,
        keyCodes: code,
      };
    });
  }, [details, selectedSummary]);

  const promoText = useMemo(() => {
    const base = details ?? selectedSummary;
    if (!base) return null;
    if (!base.promoCode) return null;
    const amount = typeof base.promoDiscountValue === "number" ? ` (${formatUsd(base.promoDiscountValue)})` : "";
    return `${base.promoCode}${amount}`;
  }, [details, selectedSummary]);

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
                <SidebarItem key={item.key} item={item} active={item.key === "manage-orders"} />
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
                <h1 className="text-3xl font-semibold">Orders</h1>
                <p className="mt-1 text-sm text-white/70">View and update customer order payment status.</p>
              </div>
              <button
                type="button"
                onClick={loadOrders}
                className="w-fit rounded-full border border-white/20 bg-white/5 px-5 py-2 text-sm font-semibold text-white hover:bg-white/10"
              >
                Refresh
              </button>
            </div>

            {listMsg ? (
              <div className={`mt-6 rounded-2xl border p-4 ${listMsg.type === "error" ? "border-red-400/30 bg-red-500/10 text-red-100" : "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"}`}>
                {listMsg.text}
              </div>
            ) : null}

            <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1.2fr]">
              <section className="rounded-3xl border border-white/10 bg-black/10 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-lg font-semibold">All Orders</p>
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by id, email, status, promo…"
                    className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/20 sm:w-[300px]"
                  />
                </div>

                <div className="mt-4 max-h-[560px] overflow-auto pr-1">
                  {loading ? (
                    <p className="py-10 text-center text-sm text-white/70">Loading…</p>
                  ) : filteredOrders.length === 0 ? (
                    <p className="py-10 text-center text-sm text-white/70">No orders found.</p>
                  ) : (
                    <div className="space-y-3">
                      {filteredOrders.map((order) => {
                        const active = order.id === selectedId;
                        const dateText = order.orderDate ? new Date(order.orderDate).toLocaleString() : "-";
                        const customerText = order.customer?.email ?? order.customer?.name ?? "-";
                        return (
                          <button
                            key={order.id}
                            type="button"
                            onClick={() => setSelectedId(order.id)}
                            className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                              active ? "border-white/30 bg-white/10" : "border-white/10 bg-white/5 hover:bg-white/10"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-white/90">{order.id}</p>
                                <p className="mt-1 truncate text-xs text-white/60">{customerText}</p>
                                <p className="mt-2 text-xs text-white/60">{dateText}</p>
                              </div>
                              <div className="shrink-0 text-right">
                                <p className="text-sm font-semibold">{formatUsd(order.totalValue)}</p>
                                <p className="mt-1 text-xs text-white/70">{order.paymentStatus ?? "-"}</p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-3xl border border-white/10 bg-black/10 p-5">
                {!selectedId ? (
                  <p className="py-10 text-center text-sm text-white/70">Select an order to view details.</p>
                ) : detailsLoading ? (
                  <p className="py-10 text-center text-sm text-white/70">Loading details…</p>
                ) : detailsMsg ? (
                  <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-red-100">
                    {detailsMsg.text}
                  </div>
                ) : details ? (
                  <>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-white/70">Order ID</p>
                        <p className="truncate text-lg font-semibold">{details.id}</p>
                        <div className="mt-2 grid gap-1 text-sm text-white/75">
                          <p>
                            <span className="text-white/55">Customer:</span>{" "}
                            {details.customer?.email ?? details.customer?.name ?? "-"}
                          </p>
                          <p>
                            <span className="text-white/55">Date:</span>{" "}
                            {details.orderDate ? new Date(details.orderDate).toLocaleString() : "-"}
                          </p>
                          <p>
                            <span className="text-white/55">Payment:</span>{" "}
                            {details.paymentMethod ?? "-"}{" "}
                            {details.transactionId ? (
                              <span className="text-white/55">({details.transactionId})</span>
                            ) : null}
                          </p>
                          {promoText ? (
                            <p>
                              <span className="text-white/55">Promo:</span> {promoText}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="w-full max-w-sm space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm font-semibold">Payment Status</p>
                        <select
                          value={statusDraft}
                          onChange={(e) => setStatusDraft(e.target.value)}
                          className="h-11 w-full rounded-xl border border-white/15 bg-[#0c143d] px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Completed">Completed</option>
                          <option value="Failed">Failed</option>
                          <option value="Refunded">Refunded</option>
                        </select>
                        {statusMsg ? (
                          <p className={`text-sm ${statusMsg.type === "error" ? "text-red-200" : "text-emerald-200"}`}>
                            {statusMsg.text}
                          </p>
                        ) : null}
                        <button
                          type="button"
                          disabled={statusSaving}
                          onClick={saveStatus}
                          className={`h-11 w-full rounded-xl bg-[#1b1a55] text-sm font-semibold text-white ${
                            statusSaving ? "opacity-70" : "hover:bg-[#232171]"
                          }`}
                        >
                          {statusSaving ? "Saving…" : "Save"}
                        </button>
                      </div>
                    </div>

                    <div className="mt-6">
                      <div className="flex items-center justify-between">
                        <p className="text-lg font-semibold">Items</p>
                        <p className="text-sm text-white/70">Total: {formatUsd(details.totalValue)}</p>
                      </div>

                      {detailItems.length === 0 ? (
                        <p className="mt-3 text-sm text-white/70">No items found for this order.</p>
                      ) : (
                        <div className="mt-4 space-y-3">
                          {detailItems.map((it) => (
                            <div
                              key={it.key}
                              className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4"
                            >
                              <div className="flex min-w-0 items-center gap-4">
                                {it.image ? (
                                  <img
                                    src={it.image}
                                    alt=""
                                    className="h-14 w-14 rounded-xl object-cover ring-1 ring-white/10"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="h-14 w-14 rounded-xl bg-white/10 ring-1 ring-white/10" />
                                )}
                                <div className="min-w-0">
                                  <Link href={it.href} className="truncate text-sm font-semibold text-white/90 hover:underline">
                                    {it.name}
                                  </Link>
                                  <p className="mt-1 text-xs text-white/60">
                                    Qty {it.quantity} · ${ (it.unitPriceCents / 100).toFixed(2) } each
                                  </p>
                                  {it.keyCodes?.length ? (
                                    <p className="mt-2 text-xs text-white/60">
                                      Keys: {it.keyCodes.slice(0, 3).join(", ")}
                                      {it.keyCodes.length > 3 ? ` (+${it.keyCodes.length - 3} more)` : ""}
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                              <p className="shrink-0 text-sm font-semibold text-white">
                                ${ (it.totalCents / 100).toFixed(2) }
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="py-10 text-center text-sm text-white/70">Select an order to view details.</p>
                )}
              </section>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
