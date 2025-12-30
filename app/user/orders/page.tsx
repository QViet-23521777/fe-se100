"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/app/context/AuthContext";
import { gameStoreApiUrl } from "@/lib/game-store-api";
import { getOrders, type OrderRecord } from "@/lib/orders";

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
  image?: string;
  keyCodes?: string[];
};

type OrderView = {
  id: string;
  dateIso: string;
  totalCents: number;
  items: OrderItemView[];
  source: "local" | "api";
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

function normalizeLocalOrders(records: OrderRecord[]): OrderView[] {
  return records
    .map((order) => {
      const id = safeString(order.id) || `local_${order.createdAt}`;
      const items: OrderItemView[] = (order.items ?? []).map((item) => ({
        id: safeString(item.id) || `${id}_${item.name}`,
        name: safeString(item.name) || "Unknown game",
        quantity:
          typeof item.quantity === "number" && Number.isFinite(item.quantity)
            ? Math.max(1, Math.floor(item.quantity))
            : 1,
        unitPriceCents:
          typeof item.unitPriceCents === "number" && Number.isFinite(item.unitPriceCents)
            ? item.unitPriceCents
            : null,
        image: safeString(item.image) || undefined,
      }));

      return {
        id,
        dateIso: safeString(order.createdAt) || new Date().toISOString(),
        totalCents:
          typeof order.totalCents === "number" && Number.isFinite(order.totalCents)
            ? Math.max(0, Math.floor(order.totalCents))
            : 0,
        items,
        source: "local",
      } satisfies OrderView;
    })
    .filter((order) => Boolean(order.id));
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
              image: imageUrl || undefined,
              keyCodes: keyCodes?.length ? keyCodes : undefined,
            } satisfies OrderItemView;
          })
        : [];

      const itemsFromDetails: OrderItemView[] = Array.isArray(order.orderDetails)
        ? order.orderDetails.map((detail, idx) => {
            const name = safeString(detail.game?.name) || "Unknown game";
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
              image: imageUrl || undefined,
              keyCodes: keyCode ? [keyCode] : undefined,
            } satisfies OrderItemView;
          })
        : [];

      const items = itemsFromEmbedded.length ? itemsFromEmbedded : itemsFromDetails;

      return {
        id,
        dateIso,
        totalCents,
        items,
        source: "api",
      } satisfies OrderView;
    })
    .filter((order) => Boolean(order.id));
}

function mergeOrders(localOrders: OrderView[], apiOrders: OrderView[]) {
  const byId = new Map<string, OrderView>();
  for (const order of localOrders) byId.set(order.id, order);
  for (const order of apiOrders) byId.set(order.id, order);

  return Array.from(byId.values()).sort((a, b) => {
    const at = Date.parse(a.dateIso);
    const bt = Date.parse(b.dateIso);
    const aTime = Number.isFinite(at) ? at : 0;
    const bTime = Number.isFinite(bt) ? bt : 0;
    return bTime - aTime;
  });
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
      {active ? (
        <>
          <span className="absolute left-0 top-0 h-full w-[3px] bg-white/20" />
          <span className="absolute right-0 top-0 h-full w-[3px] bg-white/20" />
        </>
      ) : null}
      <p className={`text-lg font-semibold ${active ? "text-white/75" : "text-white"}`}>
        {title}
      </p>
      <p className="mt-1 text-sm text-white/55">{subtitle}</p>
    </Link>
  );
}

export default function OrdersPage() {
  const { token } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [orders, setOrders] = useState<OrderView[]>([]);
  const [loadingApi, setLoadingApi] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newFlag, setNewFlag] = useState<string | null>(null);
  const [hashOrderId, setHashOrderId] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    setOrders(normalizeLocalOrders(getOrders()));
  }, [mounted]);

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
        const localOrders = normalizeLocalOrders(getOrders());
        const apiOrders = normalizeApiOrders(data);
        if (!active) return;
        setOrders(mergeOrders(localOrders, apiOrders));
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
                subtitle="Modify Your Personal Information"
                href="/user/profile"
              />
              <AccountSidebarItem
                title="My Orders"
                subtitle="View Your Previous Orders"
                href="/user/orders"
                active
              />
              <AccountSidebarItem
                title="Wishlist"
                subtitle="View Games You Added in Wishlist"
                href="/wishlist"
              />
              <AccountSidebarItem
                title="Payment Methods"
                subtitle="Adjust Your Payment Method"
                href="/user/payment-methods"
              />
            </div>
          </aside>

          <main className="space-y-6 rounded-3xl border border-white/10 bg-[#1b1a55]/30 p-6 shadow-2xl backdrop-blur">
            {showLogin ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/75">
                Log in to sync orders from your account. Local checkout orders will still
                show here.
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

            {!hasOrders ? (
              <EmptyState showLogin={showLogin} />
            ) : (
              <div className="space-y-5">
                {orders.map((order) => {
                  const isExpanded = expandedId === order.id;
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
                          <div className="flex items-center justify-between gap-4">
                            <p className="text-sm font-semibold text-white">Order items</p>
                            <span className="text-xs text-white/50">
                              Source: {order.source === "api" ? "Account" : "Local"}
                            </span>
                          </div>

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
