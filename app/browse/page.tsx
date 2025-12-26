import Link from "next/link";

import { TopBar } from "@/components/TopBar";
import { AddToCartPillButton, WishlistIconButton } from "@/components/StoreActions";
import { fetchSteamApps, type SteamApp } from "@/lib/steam-apps";

export const dynamic = "force-dynamic";

type BrowseCard = {
  steamAppId?: number;
  title: string;
  price: string;
  originalPrice?: string;
  discount?: string;
  image: string;
};

const heroBanner = "/assets/6ae5fe37d055bdf5609d1bde8dd81809fa9e9ba3.png";

const PRICE_POINTS = [
  9.99, 14.99, 19.99, 24.99, 29.99, 39.99, 49.99, 59.99, 69.99,
];

function formatUsd(price: number) {
  return `$${price.toFixed(2)}`;
}

function pseudoOriginalPrice(steamAppId: number) {
  const idx = Math.abs(steamAppId) % PRICE_POINTS.length;
  return PRICE_POINTS[idx];
}

function steamHeaderUrl(app: SteamApp) {
  return (
    app.avatarUrl ??
    `https://cdn.cloudflare.steamstatic.com/steam/apps/${app.steamAppId}/header.jpg`
  );
}

function Card({ card }: { card: BrowseCard }) {
  const href = card.steamAppId ? `/product/${card.steamAppId}` : "/browse";
  const storeItem = {
    steamAppId: card.steamAppId,
    name: card.title,
    image: card.image,
    priceLabel: card.price,
    originalPriceLabel: card.originalPrice ?? null,
  };

  return (
    <Link
      href={href}
      className="group relative flex h-[320px] flex-col overflow-hidden rounded-2xl bg-gradient-to-t from-black/70 via-black/30 to-transparent shadow-lg"
    >
      <img
        src={card.image}
        alt={card.title}
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#070f2b] via-[#070f2b]/35 to-transparent" />

      <WishlistIconButton
        item={storeItem}
        className="absolute left-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/30 text-white/80 backdrop-blur-md transition hover:bg-black/40"
      />

      <div className="relative mt-auto flex flex-col gap-2 p-4">
        <p className="text-base font-semibold leading-tight line-clamp-2">
          {card.title}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {card.discount ? (
            <span className="rounded-md bg-[#9290c3] px-2 py-1 text-xs text-white/90">
              {card.discount}
            </span>
          ) : null}
          {card.originalPrice ? (
            <span className="text-sm text-white/60 line-through">
              {card.originalPrice}
            </span>
          ) : null}
          <span className="text-sm text-white/85">{card.price}</span>
        </div>
        <div className="mt-2 flex justify-end">
          <AddToCartPillButton
            item={storeItem}
            label="Add to Cart"
            className="rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-[#1b1a55] shadow transition hover:bg-white"
          />
        </div>
      </div>
    </Link>
  );
}

type SearchParams = Record<string, string | string[] | undefined>;

function readParam(params: SearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams> | SearchParams;
}) {
  const resolvedParams = await Promise.resolve(searchParams ?? {});
  const q = (readParam(resolvedParams, "q") ?? "").trim();
  const pageRaw = readParam(resolvedParams, "page") ?? "1";
  const pageNumberRaw = Number(pageRaw);
  const page = Number.isFinite(pageNumberRaw) ? Math.max(1, Math.floor(pageNumberRaw)) : 1;

  const limit = 24;
  const skip = (page - 1) * limit;

  const steamApps = await fetchSteamApps({
    search: q ? q : undefined,
    skip,
    limit,
  });

  const cards: BrowseCard[] = steamApps.map((app) => ({
    steamAppId: app.steamAppId,
    title: app.name,
    price: formatUsd(pseudoOriginalPrice(app.steamAppId)),
    image: steamHeaderUrl(app),
  }));

  const showApiHint = cards.length === 0 && !q;
  const hasNext = cards.length === limit;

  const prevHref = (() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("page", String(Math.max(1, page - 1)));
    return `/browse?${params.toString()}`;
  })();

  const nextHref = (() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("page", String(page + 1));
    return `/browse?${params.toString()}`;
  })();

  return (
    <div className="w-full bg-[#070f2b] text-white -mx-5 sm:-mx-10">
      <div className="flex w-full flex-col gap-8 px-5 pb-16 pt-6 sm:px-8 lg:px-10">
        <TopBar active="browse" />

        <section className="space-y-3">
          <h1 className="text-3xl font-bold">Browse Games</h1>
          <form
            action="/browse"
            method="get"
            className="flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <input
              name="q"
              defaultValue={q}
              placeholder="Search games..."
              className="h-12 w-full rounded-xl bg-[#1b1a55] px-4 text-white placeholder:text-white/60 outline-none focus:ring-2 focus:ring-white/30 sm:max-w-xl"
            />
            <button
              type="submit"
              className="h-12 rounded-xl bg-white px-5 text-sm font-semibold text-[#1b1a55]"
            >
              Search
            </button>
          </form>
          {q ? (
            <p className="text-sm text-white/70">
              Showing results for <span className="font-semibold text-white">{q}</span> (page{" "}
              {page})
            </p>
          ) : (
            <p className="text-sm text-white/70">Page {page}</p>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-3xl font-bold">Special Events</h2>
          <div className="relative h-[220px] overflow-hidden rounded-2xl shadow-2xl">
            <img
              src={heroBanner}
              alt="Summer sale"
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#ff8d10] via-[#ff8d10]/40 to-transparent opacity-70" />
            <div className="relative flex h-full flex-col justify-center gap-3 px-6">
              <p className="text-lg font-semibold uppercase text-white">Up to 70% off</p>
              <p className="text-4xl font-black text-white drop-shadow">Summer Savings</p>
              <p className="max-w-xl text-sm text-white/90">
                Make this summer unforgettable with GameVerse at unbeatable prices.
                Grab your favorites now — up to 70% off for a limited time!
              </p>
              <Link
                href="#grid"
                className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#1b1a55]"
              >
                Browse Now
              </Link>
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="flex-1 space-y-6" id="grid">
            {showApiHint ? (
              <div className="rounded-2xl border border-white/10 bg-[#0c143d]/60 p-5 text-sm text-white/75 shadow-xl">
                Start the `game-store-api` server to load Steam games in Browse.
              </div>
            ) : null}

            {cards.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-[#0c143d]/60 p-5 text-sm text-white/75 shadow-xl">
                No games found.
              </div>
            ) : null}

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {cards.map((card) => (
                <Card key={card.steamAppId ?? card.title} card={card} />
              ))}
            </div>

            <div className="flex items-center justify-center gap-3 pt-4 text-sm text-white/70">
              <Link
                href={prevHref}
                className={`rounded-full bg-[#1b1a55] px-4 py-2 text-white transition ${
                  page > 1 ? "hover:bg-[#26266d]" : "pointer-events-none opacity-50"
                }`}
              >
                Prev
              </Link>
              <span className="px-2">Page {page}</span>
              <Link
                href={nextHref}
                className={`rounded-full bg-[#1b1a55] px-4 py-2 text-white transition ${
                  hasNext ? "hover:bg-[#26266d]" : "pointer-events-none opacity-50"
                }`}
              >
                Next
              </Link>
            </div>
          </div>

          <aside className="w-full max-w-xs space-y-6 rounded-2xl bg-[#0c143d] p-5 shadow-xl lg:sticky lg:top-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-semibold">Filters</h3>
              <button className="text-sm text-cyan-300" type="button">
                Reset
              </button>
            </div>
            <div className="rounded-xl bg-[#1b1a55] px-4 py-3 text-sm text-white/80">
              Keywords
            </div>
            <div className="space-y-4 text-white/80">
              {["Sort by", "Genres", "Price", "Platform", "Ratings"].map((label) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-lg px-1 py-2"
                >
                  <span className="text-lg">{label}</span>
                  <span className="text-xl text-white/60">›</span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

