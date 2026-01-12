"use client";

import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { useStore } from "@/app/context/StoreContext";

const logo = "/assets/figma-logo.svg";
const socials = [
  "/assets/figma-social-28-2108.svg",
  "/assets/figma-social-28-2109.svg",
  "/assets/figma-social-28-2110.svg",
  "/assets/figma-social-28-2111.svg",
];

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function cartItemHref(item: { id: string; steamAppId?: number; slug?: string; name: string }) {
  if (typeof item.steamAppId === "number" && Number.isFinite(item.steamAppId)) {
    return `/product/${Math.floor(item.steamAppId)}`;
  }

  const slug =
    item.slug ?? (item.id.startsWith("slug:") ? item.id.slice("slug:".length) : "");

  if (slug) {
    return /^[a-f0-9]{24}$/i.test(slug) ? `/product/game/${slug}` : `/product/${slug}`;
  }

  return `/browse?q=${encodeURIComponent(item.name)}`;
}

export default function CartPage() {
  const {
    cart,
    cartCount,
    subtotalCents,
    setCartQuantity,
    removeFromCart,
    promoCode,
    promoPreview,
    promoLoading,
    promoError,
    setPromoCode,
    previewPromo,
    clearPromo,
  } = useStore();

  const hasItems = cart.length > 0;
  const discountCents = promoPreview?.discountCents ?? 0;
  const totalCents =
    promoPreview && promoPreview.totalCents >= 0 ? promoPreview.totalCents : subtotalCents;

  return (
    <div className="min-h-screen w-full bg-[#070f2b] text-white -mx-5 sm:-mx-10">
      <div className="flex w-full flex-col gap-10 px-5 pb-16 pt-6 sm:px-8 lg:px-10">
        <TopBar />

        <header className="space-y-2">
          <h1 className="text-3xl font-semibold">Shopping Cart</h1>
          <p className="text-white/70">
            {cartCount === 0
              ? "Your cart is empty"
              : `You have ${cartCount} item${cartCount === 1 ? "" : "s"} in your cart`}
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1.5fr_0.7fr]">
          <section className="space-y-6 rounded-[18px] bg-gradient-to-br from-white/10 to-black/20 p-6 shadow-2xl">
            {!hasItems ? (
              <div className="flex flex-col items-center justify-center gap-4 py-14 text-white/70">
                <p className="text-lg font-semibold text-white">No items yet</p>
                <Link
                  href="/browse"
                  className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#1b1a55]"
                >
                  Browse games
                </Link>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div
                  key={item.id}
                  className={`flex flex-col gap-4 border-white/10 ${
                    idx !== cart.length - 1 ? "pb-6 border-b" : ""
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <Link
                      href={cartItemHref(item)}
                      className="h-24 w-24 overflow-hidden rounded-[10px] bg-black/30 ring-1 ring-white/10 transition hover:ring-white/20"
                      aria-label={`View ${item.name}`}
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </Link>
                    <div className="flex flex-1 flex-col gap-2">
                      <Link
                        href={cartItemHref(item)}
                        className="text-lg font-semibold text-white/95 hover:underline"
                      >
                        {item.name}
                      </Link>
                      <div className="flex items-center gap-2 text-sm text-white/70">
                        {item.originalPriceLabel ? (
                          <span className="line-through">{item.originalPriceLabel}</span>
                        ) : null}
                        {item.priceLabel ? (
                          <span className="text-white/85">{item.priceLabel}</span>
                        ) : typeof item.unitPriceCents === "number" ? (
                          <span className="text-white/85">{formatCents(item.unitPriceCents)}</span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            item.quantity <= 1
                              ? removeFromCart(item.id)
                              : setCartQuantity(item.id, item.quantity - 1)
                          }
                          className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/30 bg-[#1b1a55] text-xl text-white/80"
                          aria-label={`Decrease quantity for ${item.name}`}
                        >
                          -
                        </button>
                        <div className="flex h-10 w-12 items-center justify-center rounded-lg border border-white/30 bg-[#1b1a55]">
                          <span className="text-base">{item.quantity}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setCartQuantity(item.id, item.quantity + 1)
                          }
                          className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/30 bg-[#1b1a55] text-xl text-white/80"
                          aria-label={`Increase quantity for ${item.name}`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-3 text-right">
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className="text-sm text-white/70 hover:text-white"
                        aria-label={`Remove ${item.name} from cart`}
                      >
                        Remove
                      </button>
                      <p className="text-lg font-semibold">
                        {typeof item.unitPriceCents === "number"
                          ? formatCents(item.unitPriceCents * item.quantity)
                          : item.priceLabel ?? "-"}
                      </p>
                      <p className="text-lg hidden">
                        {item.priceLabel ??
                          (typeof item.unitPriceCents === "number"
                            ? formatCents(item.unitPriceCents)
                            : "—")}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </section>

          <aside className="space-y-4 rounded-[18px] bg-gradient-to-b from-white/10 to-black/20 p-6 shadow-2xl">
            <h2 className="text-2xl font-semibold">Order Summary</h2>
            <SummaryRow label="Subtotal" value={formatCents(subtotalCents)} />
            <SummaryRow label="Discount" value={formatCents(discountCents)} />
            <div className="h-px w-full bg-white/20" />
            <div className="space-y-2">
              <p className="text-lg">Discount Code</p>
              <div className="flex gap-2">
                <input
                  className="h-[46px] w-full rounded-[10px] border border-white/30 bg-transparent px-3 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                  placeholder="Enter code"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                />
                <button
                  type="button"
                  disabled={!hasItems || promoLoading}
                  onClick={() => previewPromo()}
                  className={`h-[46px] whitespace-nowrap rounded-[10px] bg-[#1b1a55] px-4 text-sm font-semibold ${
                    !hasItems || promoLoading ? "opacity-60" : "hover:bg-[#232171]"
                  }`}
                >
                  {promoLoading ? "Applying…" : "Apply"}
                </button>
                <button
                  type="button"
                  disabled={!promoCode.trim() || promoLoading}
                  onClick={clearPromo}
                  className={`h-[46px] whitespace-nowrap rounded-[10px] border border-white/30 px-4 text-sm font-semibold ${
                    !promoCode.trim() || promoLoading ? "opacity-60" : "hover:bg-white/10"
                  }`}
                >
                  Clear
                </button>
              </div>
              {promoError ? (
                <p className="text-sm text-red-200/90">{promoError}</p>
              ) : promoPreview?.code ? (
                <p className="text-sm text-white/70">Applied: {promoPreview.code}</p>
              ) : null}
            </div>
            <div className="h-px w-full bg-white/20" />
            <div className="flex items-center justify-between text-xl font-semibold">
              <span>Total</span>
              <span>{formatCents(totalCents)}</span>
            </div>
            <Link
              href="/checkout"
              className={`w-full rounded-[12px] bg-[#1b1a55] px-4 py-3 text-center text-sm font-semibold block ${
                hasItems ? "" : "pointer-events-none opacity-50"
              }`}
            >
              Proceed to Checkout
            </Link>
            <Link
              href="/browse"
              className="w-full rounded-[12px] border border-white/30 px-4 py-3 text-center text-sm font-semibold block"
            >
              Continue Shopping
            </Link>
          </aside>
        </div>

        <footer className="mt-6 space-y-6 border-t border-white/10 pt-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-center gap-3">
              <img src={logo} alt="GameVerse" className="h-10 w-10" />
              <span className="text-xl font-semibold">GameVerse</span>
            </div>
            <div className="space-y-2 max-w-xl text-sm text-white/80">
              GameVerse — Where every gamer levels up! From epic AAA adventures
              to indie gems, grab the hottest deals on PC, Xbox, PlayStation &
              Nintendo. Play more, pay less.
            </div>
            <div className="grid grid-cols-2 gap-10 text-sm">
              <div className="space-y-2">
                <p className="text-base font-semibold text-white">My Account</p>
                <Link href="/user/login" className="block text-white/80">
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
                <img
                  key={icon}
                  src={icon}
                  alt="social"
                  className="h-8 w-8"
                  loading="lazy"
                />
              ))}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-base text-white/80">
      <span>{label}</span>
      <span className="text-white">{value}</span>
    </div>
  );
}

