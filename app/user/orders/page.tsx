"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/app/context/AuthContext";
import { gameStoreApiUrl } from "@/lib/game-store-api";

const logo = "/assets/figma-logo.svg";
const socials = [
  "/assets/figma-social-28-2108.svg",
  "/assets/figma-social-28-2109.svg",
  "/assets/figma-social-28-2110.svg",
  "/assets/figma-social-28-2111.svg",
];

type ApiOrder = {
  id?: string;
  orderDate?: string;
  createdAt?: string;
  totalAmount?: number;
  totalValue?: number;
  totalCents?: number;
  paymentStatus?: string;
  promoCode?: string;
  promoDiscountValue?: number;
  items?: Array<{
    steamAppId?: number;
    slug?: string;
    name?: string;
    quantity?: number;
    unitPriceCents?: number;
    unitPrice?: number;
    image?: string;
    keyCodes?: string[];
    keyCode?: string;
  }>;
  orderDetails?: Array<{
    id?: string;
    quantity?: number;
    unitPrice?: number;
    game?: {
      name?: string;
      imageUrl?: string;
      steamAppId?: number;
      steam_appid?: number;
    };
    gameKey?: {
      keyCode?: string;
    };
  }>;
};

type OrderItemView = {
  id: string;
  name: string;
  quantity: number;
  unitPriceCents: number | null;
  steamAppId?: number | null;
  slug?: string | null;
  image?: string;
  keyCodes?: string[];
};

type OrderView = {
  id: string;
  dateIso: string;
  totalCents: number;
  paymentStatus: string;
  items: OrderItemView[];
};

type RefundRequestView = {
  id: string;
  orderId: string;
  status: "Pending" | "Approved" | "Rejected" | string;
  requestedAt?: string;
  resolvedAt?: string;
  reason?: string;
  resolutionNote?: string;
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function safeString(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function formatOrderDate(iso: string) {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "Unknown date";
  const month = MONTHS[parsed.getUTCMonth()] ?? "Unknown";
  return `${month} ${parsed.getUTCDate()}, ${parsed.getUTCFullYear()}`;
}

function formatCents(cents: number) {
  const safe = Number.isFinite(cents) ? cents : 0;
  return `$${(safe / 100).toFixed(2)}`;
}

function parseAmountToCents(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.round(value * 100);
}

function parseCentsValue(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

const REFUND_WINDOW_DAYS =
  Number(process.env.NEXT_PUBLIC_REFUND_WINDOW_DAYS ?? "7") || 7;

function isWithinRefundWindow(dateIso: string) {
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return false;
  const ms = Date.now() - date.getTime();
  const days = ms / (1000 * 60 * 60 * 24);
  return days >= 0 && days <= REFUND_WINDOW_DAYS;
}

function normalizeRefundRequestsByOrderId(input: unknown) {
  const byOrder: Record<string, RefundRequestView> = {};
  if (!Array.isArray(input)) return byOrder;

  for (const raw of input as any[]) {
    const id = safeString(raw?.id);
    const orderId = safeString(raw?.orderId ?? raw?.order?.id);
    if (!id || !orderId) continue;

    const requestedAt = safeString(raw?.requestedAt);
    const existing = byOrder[orderId];
    const existingDate = existing?.requestedAt ? new Date(existing.requestedAt).getTime() : 0;
    const nextDate = requestedAt ? new Date(requestedAt).getTime() : 0;

    if (existing && existingDate >= nextDate) continue;

    byOrder[orderId] = {
      id,
      orderId,
      status: safeString(raw?.status) || "Pending",
      requestedAt: requestedAt || undefined,
      resolvedAt: safeString(raw?.resolvedAt) || undefined,
      reason: safeString(raw?.reason) || undefined,
      resolutionNote: safeString(raw?.resolutionNote) || undefined,
    };
  }

  return byOrder;
}

function normalizeApiOrders(input: unknown): OrderView[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((raw) => raw as ApiOrder)
    .map((order) => {
      const id = safeString(order.id);
      const dateIso =
        safeString(order.orderDate) ||
        safeString(order.createdAt) ||
        new Date().toISOString();

      const totalCents =
        typeof order.totalCents === "number"
          ? parseCentsValue(order.totalCents)
          : parseAmountToCents(
              typeof order.totalAmount === "number" ? order.totalAmount : order.totalValue
            );

      const itemsFromEmbedded: OrderItemView[] = Array.isArray(order.items)
        ? order.items.map((item, idx) => {
            const steamAppId =
              typeof item.steamAppId === "number" && Number.isFinite(item.steamAppId)
                ? Math.floor(item.steamAppId)
                : null;
            const slug = safeString(item.slug) || null;
            const name = safeString(item.name) || "Unknown game";
            const quantity =
              typeof item.quantity === "number" && Number.isFinite(item.quantity)
                ? Math.max(1, Math.floor(item.quantity))
                : 1;
            const unitPriceCents =
              typeof item.unitPriceCents === "number" && Number.isFinite(item.unitPriceCents)
                ? parseCentsValue(item.unitPriceCents)
                : typeof item.unitPrice === "number"
                  ? parseAmountToCents(item.unitPrice)
                  : null;

            const imageUrl =
              safeString(item.image) ||
              (typeof steamAppId === "number"
                ? `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${steamAppId}/header.jpg`
                : "");

            const keyCodes = Array.isArray(item.keyCodes)
              ? item.keyCodes.map((code) => safeString(code)).filter(Boolean)
              : safeString(item.keyCode)
                ? [safeString(item.keyCode)]
                : undefined;

            return {
              id: `${id || "api"}_${idx}`,
              name,
              quantity,
              unitPriceCents,
              steamAppId,
              slug,
              image: imageUrl || undefined,
              keyCodes: keyCodes?.length ? keyCodes : undefined,
            } satisfies OrderItemView;
          })
        : [];

      const itemsFromDetails: OrderItemView[] = Array.isArray(order.orderDetails)
        ? order.orderDetails.map((detail, idx) => {
            const name = safeString(detail.game?.name) || "Unknown game";
            const detailGameId = safeString((detail as any)?.gameId ?? (detail as any)?.game?.id) || null;
            const steamAppId =
              typeof (detail as any)?.game?.steamAppId === "number"
                ? Math.floor((detail as any).game.steamAppId)
                : typeof (detail as any)?.game?.steam_appid === "number"
                  ? Math.floor((detail as any).game.steam_appid)
                  : null;
            const quantity =
              typeof detail.quantity === "number" && Number.isFinite(detail.quantity)
                ? Math.max(1, Math.floor(detail.quantity))
                : 1;
            const unitPriceCents = parseAmountToCents(detail.unitPrice);
            const keyCode = safeString(detail.gameKey?.keyCode) || undefined;

            const imageUrl =
              safeString(detail.game?.imageUrl) ||
              (typeof detail.game?.steamAppId === "number"
                ? `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${detail.game.steamAppId}/header.jpg`
                : typeof detail.game?.steam_appid === "number"
                  ? `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${detail.game.steam_appid}/header.jpg`
                  : "");

            return {
              id: safeString(detail.id) || `${id || "api"}_${idx}`,
              name,
              quantity,
              unitPriceCents: Number.isFinite(unitPriceCents) ? unitPriceCents : null,
              steamAppId,
              slug: detailGameId,
              image: imageUrl || undefined,
              keyCodes: keyCode ? [keyCode] : undefined,
            } satisfies OrderItemView;
          })
        : [];

      const items = itemsFromEmbedded.length ? itemsFromEmbedded : itemsFromDetails;
      const paymentStatus = safeString(order.paymentStatus) || "Pending";

      return {
        id,
        dateIso,
        totalCents,
        paymentStatus,
        items,
      } satisfies OrderView;
    })
    .filter((order) => Boolean(order.id));
}

function ChevronDownIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function EmptyState({ showLogin }: { showLogin: boolean }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#0c143d]/60 p-6 text-white/75 shadow-xl">
      <p className="mb-4 text-lg font-semibold text-white">No orders yet</p>
      <p className="mb-6 text-sm text-white/70">
        Once you complete a purchase, your order history will appear here.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/browse"
          className="inline-flex rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#1b1a55]"
        >
          Browse games
        </Link>
        {showLogin ? (
          <Link
            href="/user/login?next=%2Fuser%2Forders"
            className="inline-flex rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white"
          >
            Log in
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function AccountSidebarItem({
  title,
  subtitle,
  href,
  active,
}: {
  title: string;
  subtitle: string;
  href: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`relative block px-6 py-5 transition ${
        active ? "bg-white/10" : "hover:bg-white/5"
      }`}
    >
      {active ? <span className="absolute left-0 top-0 h-full w-2 bg-white/20" /> : null}
      <p className={`text-lg font-semibold ${active ? "text-white/60" : "text-white"}`}>{title}</p>
      <p className="mt-1 text-sm text-white/55">{subtitle}</p>
    </Link>
  );
}

export default function OrdersPage() {
  const { token, user } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [orders, setOrders] = useState<OrderView[]>([]);
  const [loadingApi, setLoadingApi] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newFlag, setNewFlag] = useState<string | null>(null);
  const [hashOrderId, setHashOrderId] = useState<string | null>(null);

  const [refundRequestsByOrderId, setRefundRequestsByOrderId] = useState<
    Record<string, RefundRequestView>
  >({});
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);

  const [refundModalOrder, setRefundModalOrder] = useState<OrderView | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [refundMsg, setRefundMsg] = useState<string | null>(null);

  const isCustomer = user?.accountType === "customer";

  type MyReview = { id: string; gameId: string; rating: number; reviewText: string; updatedAt?: string };
  const [myReviews, setMyReviews] = useState<Record<string, MyReview>>({});
  const [reviewModal, setReviewModal] = useState<{
    gameId: string;
    title: string;
  } | null>(null);
  const [reviewRating, setReviewRating] = useState("5");
  const [reviewText, setReviewText] = useState("");
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewMsg, setReviewMsg] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    try {
      setNewFlag(new URLSearchParams(window.location.search).get("new"));
    } catch {
      setNewFlag(null);
    }
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    try {
      const hash = window.location.hash || "";
      const value = hash.startsWith("#") ? hash.slice(1) : hash;
      setHashOrderId(value ? decodeURIComponent(value) : null);
    } catch {
      setHashOrderId(null);
    }
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    if (token) return;
    setOrders([]);
    setApiError(null);
    setLoadingApi(false);
    setRefundRequestsByOrderId({});
    setRefundError(null);
    setRefundLoading(false);
  }, [mounted, token]);

  useEffect(() => {
    if (!mounted) return;
    if (!token || !isCustomer) {
      setMyReviews({});
      return;
    }

    let active = true;
    (async () => {
      try {
        const res = await fetch(gameStoreApiUrl("/customers/me/reviews"), {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const data = (await res.json().catch(() => null)) as any;
        if (!res.ok) return;

        const next: Record<string, MyReview> = {};
        if (Array.isArray(data)) {
          for (const r of data) {
            const id = safeString(r?.id);
            const gameId = safeString(r?.gameId);
            if (!id || !gameId) continue;
            next[gameId] = {
              id,
              gameId,
              rating: Number(r?.rating) || 0,
              reviewText: safeString(r?.reviewText),
              updatedAt: safeString(r?.updatedAt) || undefined,
            };
          }
        }
        if (!active) return;
        setMyReviews(next);
      } catch {
        // ignore
      }
    })();

    return () => {
      active = false;
    };
  }, [isCustomer, mounted, token]);

  const isObjectId = (value: string) => /^[a-f0-9]{24}$/i.test(value);

  const openReview = (gameId: string, title: string) => {
    const existing = myReviews[gameId];
    setReviewModal({ gameId, title });
    setReviewMsg(null);
    setReviewRating(existing ? String(existing.rating || 5) : "5");
    setReviewText(existing ? existing.reviewText : "");
  };

  const closeReview = () => {
    if (reviewSaving) return;
    setReviewModal(null);
    setReviewMsg(null);
    setReviewText("");
    setReviewRating("5");
  };

  const saveReview = async () => {
    if (!token || !isCustomer || !reviewModal) return;

    const rating = Math.max(1, Math.min(5, Math.floor(Number(reviewRating) || 0)));
    const text = reviewText.trim();
    if (!text) {
      setReviewMsg("Review text is required.");
      return;
    }
    if (text.length > 2000) {
      setReviewMsg("Review text is too long (max 2000).");
      return;
    }

    setReviewSaving(true);
    setReviewMsg(null);
    try {
      const existing = myReviews[reviewModal.gameId];
      const url = existing
        ? gameStoreApiUrl(`/customers/me/reviews/${existing.id}`)
        : gameStoreApiUrl(`/customers/me/games/${reviewModal.gameId}/reviews`);
      const method = existing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ rating, reviewText: text }),
      });
      const data = (await res.json().catch(() => null)) as any;
      if (!res.ok) throw new Error(data?.message || "Failed to save review");

      const id = safeString(data?.id) || existing?.id;
      if (id) {
        setMyReviews((prev) => ({
          ...prev,
          [reviewModal.gameId]: {
            id,
            gameId: reviewModal.gameId,
            rating,
            reviewText: text,
            updatedAt: safeString(data?.updatedAt) || new Date().toISOString(),
          },
        }));
      }

      setReviewMsg("Saved.");
      closeReview();
    } catch (err) {
      setReviewMsg(err instanceof Error ? err.message : "Failed to save review");
    } finally {
      setReviewSaving(false);
    }
  };

  const deleteReview = async () => {
    if (!token || !isCustomer || !reviewModal) return;
    const existing = myReviews[reviewModal.gameId];
    if (!existing) return;
    if (!confirm("Delete your review?")) return;

    setReviewSaving(true);
    setReviewMsg(null);
    try {
      const res = await fetch(gameStoreApiUrl(`/customers/me/reviews/${existing.id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as any;
        throw new Error(data?.message || "Failed to delete review");
      }
      setMyReviews((prev) => {
        const next = { ...prev };
        delete next[reviewModal.gameId];
        return next;
      });
      closeReview();
    } catch (err) {
      setReviewMsg(err instanceof Error ? err.message : "Failed to delete review");
    } finally {
      setReviewSaving(false);
    }
  };

  useEffect(() => {
    if (!mounted) return;
    if (!token) return;

    let active = true;
    (async () => {
      setLoadingApi(true);
      setApiError(null);
      try {
        const res = await fetch(gameStoreApiUrl("/customers/me/orders"), {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const data = (await res.json().catch(() => null)) as unknown;
        if (!res.ok) {
          const message =
            (data as any)?.error?.message ||
            (data as any)?.message ||
            "Could not load server orders right now.";
          throw new Error(message);
        }
        if (!active) return;
        setOrders(normalizeApiOrders(data));
      } catch (err) {
        console.error(err);
        if (!active) return;
        setApiError(err instanceof Error ? err.message : "Failed to load server orders.");
      } finally {
        if (active) setLoadingApi(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [mounted, token]);

  useEffect(() => {
    if (!mounted) return;
    if (!token) return;

    let active = true;
    void (async () => {
      setRefundLoading(true);
      setRefundError(null);
      try {
        const res = await fetch(gameStoreApiUrl("/customers/me/refund-requests"), {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const data = (await res.json().catch(() => null)) as unknown;
        if (!res.ok) {
          const message =
            (data as any)?.error?.message ||
            (data as any)?.message ||
            "Could not load refund requests right now.";
          throw new Error(message);
        }
        if (!active) return;
        setRefundRequestsByOrderId(normalizeRefundRequestsByOrderId(data));
      } catch (err) {
        console.error(err);
        if (!active) return;
        setRefundError(err instanceof Error ? err.message : "Failed to load refund requests.");
      } finally {
        if (active) setRefundLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [mounted, token]);

  const refundableOrderIds = useMemo(() => {
    const set = new Set<string>();
    for (const order of orders) {
      const status = safeString(order.paymentStatus);
      const req = refundRequestsByOrderId[order.id];
      const hasPending = req?.status?.toLowerCase() === "pending";
      const isRefunded = status.toLowerCase() === "refunded";
      const isCompleted = status.toLowerCase() === "completed";
      if (isRefunded) continue;
      if (!isCompleted) continue;
      if (hasPending) continue;
      if (!isWithinRefundWindow(order.dateIso)) continue;
      set.add(order.id);
    }
    return set;
  }, [orders, refundRequestsByOrderId]);

  const submitRefundRequest = async () => {
    if (!token || !refundModalOrder) return;
    setRefundSubmitting(true);
    setRefundMsg(null);
    try {
      const orderId = refundModalOrder.id;
      const res = await fetch(
        gameStoreApiUrl(`/customers/me/orders/${encodeURIComponent(orderId)}/refund-requests`),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reason: refundReason.trim() || undefined }),
        }
      );
      const data = (await res.json().catch(() => null)) as any;
      if (!res.ok) {
        const message =
          data?.error?.message ||
          data?.message ||
          "Failed to create refund request.";
        throw new Error(message);
      }
      setRefundRequestsByOrderId((prev) => {
        const next = { ...prev };
        const created = normalizeRefundRequestsByOrderId([data]);
        const createdForOrder = created[orderId];
        if (createdForOrder) next[orderId] = createdForOrder;
        return next;
      });
      setRefundReason("");
      setRefundModalOrder(null);
      setRefundMsg("Refund request submitted. An admin will review it soon.");
    } catch (err) {
      setRefundMsg(err instanceof Error ? err.message : "Failed to create refund request.");
    } finally {
      setRefundSubmitting(false);
    }
  };

  useEffect(() => {
    if (!mounted) return;
    if (expandedId) return;
    if (orders.length === 0) return;
    if (hashOrderId && orders.some((order) => order.id === hashOrderId)) {
      setExpandedId(hashOrderId);
      return;
    }
    if (newFlag === "1") setExpandedId(orders[0]?.id ?? null);
  }, [expandedId, hashOrderId, mounted, newFlag, orders]);

  const showLogin = mounted && !token;
  const hasOrders = orders.length > 0;

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
              <AccountSidebarItem
                title="Personal Information"
                subtitle="Modify your personal information"
                href="/user/profile"
              />
              <AccountSidebarItem
                title="My Orders"
                subtitle="View your previous orders"
                href="/user/orders"
                active
              />
              <AccountSidebarItem
                title="Wishlist"
                subtitle="View your saved games"
                href="/wishlist"
              />
              <AccountSidebarItem
                title="Wallet"
                subtitle="View your wallet balance"
                href="/user/payment-methods"
              />
              <AccountSidebarItem title="My Reports" subtitle="Track reports you submitted" href="/user/reports" />
            </div>
          </aside>

          <main className="space-y-6 rounded-3xl border border-white/10 bg-[#1b1a55]/30 p-6 shadow-2xl backdrop-blur">
            {showLogin ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/75">
                Log in to view your orders.
              </div>
            ) : null}

            {loadingApi ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/75">
                Loading your orders…
              </div>
            ) : null}

            {apiError ? (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
                {apiError}
              </div>
            ) : null}

            {refundError ? (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
                {refundError}
              </div>
            ) : null}

            {!hasOrders ? (
              <EmptyState showLogin={showLogin} />
            ) : (
              <div className="space-y-5">
                {orders.map((order) => {
                  const isExpanded = expandedId === order.id;
                  const paymentStatus = safeString(order.paymentStatus) || "Pending";
                  const refundReq = refundRequestsByOrderId[order.id];
                  const refundEligible = refundableOrderIds.has(order.id);
                  return (
                    <div key={order.id} className="rounded-3xl bg-[#0c143d]/30 p-4">
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : order.id)}
                        className="w-full rounded-2xl border border-white/10 bg-gradient-to-b from-white/12 to-black/25 px-6 py-5 text-left shadow-xl backdrop-blur transition hover:border-white/20"
                        aria-expanded={isExpanded}
                      >
                        <div className="flex items-center justify-between gap-6">
                          <div className="space-y-1">
                            <p className="text-sm text-white/60">
                              {formatOrderDate(order.dateIso)}
                            </p>
                            <p className="text-base font-semibold text-white/95">
                              Order Number : {order.id}
                            </p>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-sm text-white/60">Total</p>
                              <p className="text-lg font-semibold text-white">
                                {formatCents(order.totalCents)}
                              </p>
                            </div>
                            <ChevronDownIcon
                              className={`h-5 w-5 text-white/70 transition-transform ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                            />
                          </div>
                        </div>
                      </button>

                      {isExpanded ? (
                        <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 p-5">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex flex-wrap items-center gap-2 text-sm text-white/80">
                              <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">
                                Status:{" "}
                                <span className="font-semibold text-white">{paymentStatus}</span>
                              </span>
                              {refundReq ? (
                                <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">
                                  Refund:{" "}
                                  <span className="font-semibold text-white">
                                    {refundReq.status}
                                  </span>
                                </span>
                              ) : null}
                              {refundLoading ? (
                                <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">
                                  Loading refundsƒ?İ
                                </span>
                              ) : null}
                            </div>

                            <div className="flex flex-wrap items-center justify-end gap-3">
                              {refundEligible ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRefundMsg(null);
                                    setRefundReason("");
                                    setRefundModalOrder(order);
                                  }}
                                  className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-[#1b1a55]"
                                >
                                  Request refund
                                </button>
                              ) : (
                                <span className="text-xs text-white/50">
                                  {paymentStatus.toLowerCase() === "refunded"
                                    ? "Already refunded."
                                    : paymentStatus.toLowerCase() !== "completed"
                                      ? "Refund available for completed orders only."
                                      : refundReq?.status?.toLowerCase() === "pending"
                                        ? "Refund request pending."
                                        : !isWithinRefundWindow(order.dateIso)
                                          ? `Refund window is ${REFUND_WINDOW_DAYS} days.`
                                          : null}
                                </span>
                              )}
                            </div>
                          </div>

                          {refundReq?.resolutionNote ? (
                            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
                              <p className="font-semibold text-white">Refund note</p>
                              <p className="mt-1 text-white/70">
                                {refundReq.resolutionNote}
                              </p>
                            </div>
                          ) : null}

                          <p className="text-sm font-semibold text-white">Order items</p>

                          {order.items.length === 0 ? (
                            <p className="mt-4 text-sm text-white/70">
                              No item details available for this order.
                            </p>
                          ) : (
                            <div className="mt-4 space-y-3">
                              {order.items.map((item) => (
                                <div
                                  key={item.id}
                                  className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between"
                                >
                                  <div className="flex items-center gap-4">
                                    <div className="h-14 w-20 overflow-hidden rounded-lg bg-black/20">
                                      {item.image ? (
                                        <img
                                          src={item.image}
                                          alt={item.name}
                                          className="h-full w-full object-cover"
                                          loading="lazy"
                                        />
                                      ) : (
                                        <div className="h-full w-full bg-gradient-to-br from-white/10 to-black/30" />
                                      )}
                                    </div>
                                    <div>
                                      <p className="text-sm font-semibold text-white">
                                        {item.name}
                                      </p>
                                      <p className="mt-1 text-xs text-white/60">
                                        Qty: {item.quantity}
                                        {item.unitPriceCents !== null
                                          ? ` • ${formatCents(item.unitPriceCents)}`
                                          : ""}
                                      </p>
                                    </div>
                                  </div>

                                  {paymentStatus.toLowerCase() === "completed" &&
                                  isCustomer &&
                                  item.slug &&
                                  isObjectId(String(item.slug)) ? (
                                    <div className="flex flex-wrap items-center justify-end gap-3">
                                      <button
                                        type="button"
                                        onClick={() => openReview(String(item.slug), item.name)}
                                        className="rounded-full border border-white/25 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10"
                                      >
                                        {myReviews[String(item.slug)] ? "Edit review" : "Write review"}
                                      </button>
                                    </div>
                                  ) : null}

                                  {item.keyCodes?.length ? (
                                    <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/80">
                                      <p className="font-semibold">
                                        Key{item.keyCodes.length === 1 ? "" : "s"}:
                                      </p>
                                      <div className="mt-1 space-y-1">
                                        {item.keyCodes.slice(0, 3).map((code) => (
                                          <p key={code} className="font-mono text-white/90">
                                            {code}
                                          </p>
                                        ))}
                                        {item.keyCodes.length > 3 ? (
                                          <p className="text-white/50">
                                            +{item.keyCodes.length - 3} more
                                          </p>
                                        ) : null}
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        </div>

        {refundModalOrder ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#0c143d] p-6 text-white shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold tracking-wide text-white/60">
                    REFUND REQUEST
                  </p>
                  <p className="mt-1 text-2xl font-semibold">Request a refund</p>
                  <p className="mt-2 text-sm text-white/70">
                    This will create a refund request for order{" "}
                    <span className="font-semibold text-white">
                      {refundModalOrder.id}
                    </span>
                    . An admin must approve it.
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
                  onClick={() => setRefundModalOrder(null)}
                >
                  Close
                </button>
              </div>

              <div className="mt-6 space-y-3">
                <label className="block text-sm font-semibold text-white/90">
                  Reason (optional)
                </label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  rows={4}
                  maxLength={500}
                  className="w-full resize-none rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                  placeholder="Tell us why you want a refund…"
                />
                <p className="text-xs text-white/50">
                  Refunds are available within {REFUND_WINDOW_DAYS} days for completed
                  orders. Approved refunds are credited to your account balance.
                </p>

                {refundMsg ? (
                  <div
                    className={`rounded-2xl border p-4 text-sm ${
                      refundMsg.toLowerCase().includes("failed") ||
                      refundMsg.toLowerCase().includes("error")
                        ? "border-red-400/30 bg-red-500/10 text-red-100"
                        : "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                    }`}
                  >
                    {refundMsg}
                  </div>
                ) : null}

                <div className="flex flex-wrap justify-end gap-3 pt-2">
                  <button
                    type="button"
                    className="rounded-full border border-white/20 bg-white/5 px-6 py-2 text-sm font-semibold text-white hover:bg-white/10"
                    onClick={() => setRefundModalOrder(null)}
                    disabled={refundSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="rounded-full bg-white px-6 py-2 text-sm font-semibold text-[#1b1a55] disabled:opacity-70"
                    onClick={submitRefundRequest}
                    disabled={refundSubmitting}
                  >
                    {refundSubmitting ? "Submitting…" : "Submit request"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {reviewModal ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#0c143d] p-6 text-white shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold tracking-wide text-white/60">REVIEW</p>
                  <p className="mt-1 text-2xl font-semibold truncate">{reviewModal.title}</p>
                  <p className="mt-2 text-sm text-white/70">Reviews are available for purchased games only.</p>
                </div>
                <button
                  type="button"
                  className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
                  onClick={closeReview}
                  disabled={reviewSaving}
                >
                  Close
                </button>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-white/90">Rating</label>
                  <select
                    value={reviewRating}
                    onChange={(e) => setReviewRating(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white outline-none [color-scheme:dark]"
                    disabled={reviewSaving}
                  >
                    <option value="5">5 - Excellent</option>
                    <option value="4">4 - Good</option>
                    <option value="3">3 - Okay</option>
                    <option value="2">2 - Bad</option>
                    <option value="1">1 - Terrible</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-semibold text-white/90">Review</label>
                    <span className="text-xs text-white/50">{reviewText.trim().length}/2000</span>
                  </div>
                  <textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    rows={5}
                    maxLength={2000}
                    className="mt-2 w-full resize-none rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                    placeholder="Write your review..."
                    disabled={reviewSaving}
                  />
                </div>

                {reviewMsg ? (
                  <div
                    className={`rounded-2xl border p-4 text-sm ${
                      reviewMsg.toLowerCase().includes("failed") || reviewMsg.toLowerCase().includes("error")
                        ? "border-red-400/30 bg-red-500/10 text-red-100"
                        : "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                    }`}
                  >
                    {reviewMsg}
                  </div>
                ) : null}

                <div className="flex flex-wrap justify-end gap-3 pt-2">
                  {myReviews[reviewModal.gameId] ? (
                    <button
                      type="button"
                      className="rounded-full border border-red-400/50 bg-red-500/10 px-6 py-2 text-sm font-semibold text-red-100 hover:bg-red-500/20 disabled:opacity-70"
                      onClick={() => void deleteReview()}
                      disabled={reviewSaving}
                    >
                      Delete
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="rounded-full border border-white/20 bg-white/5 px-6 py-2 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-70"
                    onClick={closeReview}
                    disabled={reviewSaving}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="rounded-full bg-white px-6 py-2 text-sm font-semibold text-[#1b1a55] disabled:opacity-70"
                    onClick={() => void saveReview()}
                    disabled={reviewSaving}
                  >
                    {reviewSaving ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <footer className="mt-6 space-y-6 border-t border-white/10 pt-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-center gap-3">
              <img src={logo} alt="GameVerse" className="h-10 w-10" />
              <span className="text-xl font-semibold">GameVerse</span>
            </div>
            <div className="space-y-2 max-w-xl text-sm text-white/80">
              GameVerse — Where every gamer levels up! From epic AAA adventures to indie
              gems, grab the hottest deals on PC, Xbox, PlayStation & Nintendo. Play
              more, pay less.
            </div>
            <div className="grid grid-cols-2 gap-10 text-sm">
              <div className="space-y-2">
                <p className="text-base font-semibold text-white">My Account</p>
                <Link href="/user/account" className="block text-white/80">
                  My Account
                </Link>
                <Link href="/user/orders" className="block text-white/80">
                  My Orders
                </Link>
              </div>
              <div className="space-y-2">
                <p className="text-base font-semibold text-white">Support</p>
                <Link href="/terms" className="block text-white/80">
                  Terms and conditions
                </Link>
                <Link href="/privacy" className="block text-white/80">
                  Privacy and cookie policy
                </Link>
                <Link href="/refunds" className="block text-white/80">
                  Refund policy
                </Link>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-white/10 pt-4">
            <p className="text-sm text-white/70">
              Copyright GameVerse.com 2025, all rights reserved
            </p>
            <div className="flex items-center gap-3">
              {socials.map((icon) => (
                <img key={icon} src={icon} alt="social" className="h-8 w-8" loading="lazy" />
              ))}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
