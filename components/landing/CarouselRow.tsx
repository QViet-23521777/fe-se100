"use client";

import Link from "next/link";
import { useRef } from "react";
import { AddToCartPillButton, WishlistIconButton } from "@/components/StoreActions";

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
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollByAmount = (dir: "left" | "right") => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = Math.max(320, Math.round(el.clientWidth * 0.85));
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <section
      id={id}
      aria-label={title}
      className="flex flex-col gap-5"
    >
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
          className="no-scrollbar flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth px-1 pb-2 md:px-14"
        >
          {items.map((item) => {
            const asNumber = Number(item.id);
            const steamAppId =
              Number.isFinite(asNumber) && Number.isInteger(asNumber) ? asNumber : undefined;
            const href = steamAppId ? `/product/${steamAppId}` : `/product/game/${item.id}`;
            const storeItem = {
              steamAppId,
              slug: steamAppId ? undefined : item.id,
              name: item.title,
              image: item.imageSrc,
              priceLabel: `$${item.price.toFixed(2)}`,
              originalPriceLabel: item.originalPrice
                ? `$${item.originalPrice.toFixed(2)}`
                : null,
            };
            const discount = clampDiscount(
              item.discountPercent ??
                (item.originalPrice
                  ? ((item.originalPrice - item.price) / item.originalPrice) *
                    100
                  : NaN)
            );

            return (
              <Link
                key={item.id}
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

                  <WishlistIconButton
                    item={storeItem}
                    className="absolute left-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/30 text-white/80 backdrop-blur-md transition hover:bg-black/40"
                  />
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
                          ${item.originalPrice.toFixed(2)}
                        </span>
                      ) : null}
                      <span className="font-martian-mono text-xs text-white/80">
                        ${item.price.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <AddToCartPillButton
                    item={storeItem}
                    label={ctaLabel}
                    className="shrink-0 rounded-full bg-white/10 px-5 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/15"
                  />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
