"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useEffect } from "react";
import { useAuth } from "@/app/context/AuthContext";
import {
  AddToCartPillButton,
  WishlistIconButton,
} from "@/components/StoreActions";

export type CarouselItem = {
  id: string;
  title: string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  imageSrc: string;
};

function ChevronLeftIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function ArrowRightIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  );
}

function clampDiscount(value: number) {
  if (!Number.isFinite(value)) return undefined;
  return Math.max(0, Math.min(99, Math.round(value)));
}

function formatUsd(price: number | undefined | null): string {
  if (price == null || !Number.isFinite(price)) return "$0.00";
  return `$${price.toFixed(2)}`;
}

export default function CarouselRow({
  title,
  items,
  id,
  ctaLabel = "Add to Cart",
}: {
  title: string;
  items: CarouselItem[];
  id?: string;
  ctaLabel?: string;
}) {
  const router = useRouter();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const { user, token } = useAuth();

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isLoggedIn = isMounted && Boolean(user) && Boolean(token);

  const scrollByAmount = (dir: "left" | "right") => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = Math.max(320, Math.round(el.clientWidth * 0.85));
    el.scrollBy({
      left: dir === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <section id={id} aria-label={title} className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          {title}
          <ArrowRightIcon className="h-5 w-5 text-white/60" />
        </h2>
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-14 bg-gradient-to-r from-[#050b2a] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-14 bg-gradient-to-l from-[#050b2a] to-transparent" />

        <button
          type="button"
          aria-label={`Scroll ${title} left`}
          onClick={() => scrollByAmount("left")}
          className="absolute left-0 top-1/2 z-10 hidden h-24 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 backdrop-blur-xl transition hover:bg-white/10 md:flex"
        >
          <ChevronLeftIcon className="h-6 w-6" />
        </button>
        <button
          type="button"
          aria-label={`Scroll ${title} right`}
          onClick={() => scrollByAmount("right")}
          className="absolute right-0 top-1/2 z-10 hidden h-24 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 backdrop-blur-xl transition hover:bg-white/10 md:flex"
        >
          <ChevronRightIcon className="h-6 w-6" />
        </button>

        <div
          ref={scrollerRef}
          className="no-scrollbar flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth px-1 pb-2"
        >
          {items.map((item, index) => {
            const asNumber = Number(item.id);
            const steamAppId =
              Number.isFinite(asNumber) && Number.isInteger(asNumber)
                ? asNumber
                : undefined;

            const uniqueKey = steamAppId
              ? `steam-${steamAppId}`
              : `item-${index}-${item.id || `fallback-${index}`}`;

            const href = steamAppId ? `/product/${steamAppId}` : "/browse";
            const storeItem = {
              steamAppId,
              slug: steamAppId ? undefined : item.id,
              name: item.title,
              image: item.imageSrc,
              priceLabel: formatUsd(item.price),
              originalPriceLabel: item.originalPrice
                ? formatUsd(item.originalPrice)
                : null,
            };
            const discount = clampDiscount(
              item.discountPercent ??
                (item.originalPrice && item.price != null
                  ? ((item.originalPrice - item.price) / item.originalPrice) *
                    100
                  : NaN)
            );

            return (
              <Link
                key={uniqueKey}
                href={href}
                className="group w-[280px] shrink-0 snap-start overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl sm:w-[320px]"
              >
                <div className="relative aspect-[16/9] overflow-hidden rounded-2xl">
                  <img
                    src={item.imageSrc}
                    alt={item.title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />

                  {isMounted && isLoggedIn && (
                    <WishlistIconButton
                      item={storeItem}
                      className="absolute left-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/30 text-white/80 backdrop-blur-md transition hover:bg-black/40"
                    />
                  )}
                </div>

                <div className="mt-4 flex items-end justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white/90">
                      {item.title}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {typeof discount === "number" && discount > 0 && (
                        <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white/80">
                          -{discount}%
                        </span>
                      )}
                      {item.originalPrice ? (
                        <span className="font-martian-mono text-xs text-white/50 line-through">
                          {formatUsd(item.originalPrice)}
                        </span>
                      ) : null}
                      <span className="font-martian-mono text-xs text-white/80">
                        {formatUsd(item.price)}
                      </span>
                    </div>
                  </div>

                  {!isMounted ? (
                    <div className="h-9 w-20 shrink-0 rounded-full bg-white/10" />
                  ) : isLoggedIn ? (
                    <AddToCartPillButton
                      item={storeItem}
                      label={ctaLabel}
                      className="shrink-0 rounded-full bg-white/10 px-5 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/15"
                    />
                  ) : (
                    // ✅ FIX: Use button instead of nested Link
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        router.push("/user/login");
                      }}
                      className="shrink-0 rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                      Login
                    </button>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
