"use client";

import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { useStore, type StoreItem } from "@/app/context/StoreContext";
import { useAuth } from "@/app/context/AuthContext";
import { useEffect, useState } from "react";

function hrefForItem(item: StoreItem) {
  if (typeof item.steamAppId === "number") return `/product/${item.steamAppId}`;
  if (item.slug) return `/product/${item.slug}`;
  return "/browse";
}

export default function WishlistPage() {
  const { token } = useAuth();
  const { wishlist, addToCart, removeWishlist, wishlistHydrated, wishlistError } = useStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const summaryText = !mounted
    ? "Loading wishlist…"
    : !token
      ? "Log in to view your wishlist"
      : !wishlistHydrated
        ? "Loading wishlist…"
        : wishlistError
          ? wishlistError
          : wishlist.length === 0
            ? "No saved games yet"
            : `${wishlist.length} saved game${wishlist.length === 1 ? "" : "s"}`;

  return (
    <div className="min-h-screen w-full bg-[#070f2b] text-white -mx-5 sm:-mx-10">
      <div className="flex w-full flex-col gap-10 px-5 pb-16 pt-6 sm:px-8 lg:px-10">
        <TopBar />

        <header className="space-y-2">
          <h1 className="text-3xl font-semibold">Wishlist</h1>
          <p className="text-white/70">{summaryText}</p>
        </header>

        {!mounted ? (
          <div className="rounded-3xl border border-white/10 bg-[#0c143d]/60 p-6 text-white/75 shadow-xl">
            Loading your wishlist…
          </div>
        ) : !token ? (
          <div className="rounded-3xl border border-white/10 bg-[#0c143d]/60 p-6 text-white/75 shadow-xl">
            <p className="mb-4">Log in to save games to your wishlist and sync them across devices.</p>
            <Link
              href="/user/login?next=%2Fwishlist"
              className="inline-flex rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#1b1a55]"
            >
              Log in
            </Link>
          </div>
        ) : !wishlistHydrated ? (
          <div className="rounded-3xl border border-white/10 bg-[#0c143d]/60 p-6 text-white/75 shadow-xl">
            Loading your wishlist…
          </div>
        ) : wishlistError ? (
          <div className="rounded-3xl border border-red-400/30 bg-red-500/10 p-6 text-white/85 shadow-xl">
            {wishlistError}
          </div>
        ) : wishlist.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-[#0c143d]/60 p-6 text-white/75 shadow-xl">
            <p className="mb-4">Save games to your wishlist to find them later.</p>
            <Link
              href="/browse"
              className="inline-flex rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#1b1a55]"
            >
              Browse games
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {wishlist.map((item) => (
              <div
                key={item.id}
                className="group relative overflow-hidden rounded-3xl border border-white/10 bg-[#0c1430] shadow-lg"
              >
                <img
                  src={item.image}
                  alt={item.name}
                  className="absolute inset-0 h-full w-full object-cover opacity-90 transition duration-300 group-hover:scale-[1.02]"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#070f2b] via-[#070f2b]/35 to-transparent" />

                <div className="relative flex h-full min-h-[220px] flex-col justify-between p-5">
                  <div className="flex items-start justify-end">
                    <button
                      type="button"
                      onClick={() => removeWishlist(item.id)}
                      className="rounded-full bg-black/30 px-3 py-1 text-xs text-white/80 backdrop-blur hover:bg-black/40"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="space-y-3">
                    <Link
                      href={hrefForItem(item)}
                      className="block text-lg font-semibold leading-tight line-clamp-2"
                    >
                      {item.name}
                    </Link>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm text-white/85">
                        {item.originalPriceLabel ? (
                          <span className="mr-2 text-white/50 line-through">
                            {item.originalPriceLabel}
                          </span>
                        ) : null}
                        <span className="font-semibold">{item.priceLabel ?? "—"}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          addToCart(
                            {
                              steamAppId: item.steamAppId,
                              slug: item.slug,
                              name: item.name,
                              image: item.image,
                              priceLabel: item.priceLabel,
                              originalPriceLabel: item.originalPriceLabel,
                            },
                            1
                          )
                        }
                        className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#1b1a55] shadow"
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
