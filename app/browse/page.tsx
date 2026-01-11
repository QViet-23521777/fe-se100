import Link from "next/link";
import Image from "next/image";

import { TopBar } from "@/components/TopBar";
import { AddToCartPillButton, WishlistIconButton } from "@/components/StoreActions";
import { fetchSteamApps, type SteamApp } from "@/lib/steam-apps";
import {
  centsToUsd,
  fetchSteamAppDetailsBatch,
  hasCategory,
  hasGenre,
  type SteamAppStoreDetails,
} from "@/lib/steam-store";
import { applyStorePromotionsToUsd, fetchActiveStorePromotions, type StorePromotion } from "@/lib/store-promotions";

export const dynamic = "force-dynamic";

type BrowseCard = {
  steamAppId?: number;
  title: string;
  price: string;
  originalPrice?: string;
  discount?: string;
  image: string;
};

type SortKey =
  | "relevance"
  | "popular"
  | "price_asc"
  | "price_desc"
  | "discount_desc"
  | "name_asc";

type PlatformFilter = "" | "windows" | "mac" | "linux";

type CardWithMeta = BrowseCard & {
  effectiveUsd: number;
  originalUsd?: number;
  discountPercent: number;
  hasDeal: boolean;
  recommendationsTotal: number;
  titleSort: string;
};

const heroBanner = "/assets/6ae5fe37d055bdf5609d1bde8dd81809fa9e9ba3.png";

const PRICE_POINTS = [
  9.99, 14.99, 19.99, 24.99, 29.99, 39.99, 49.99, 59.99, 69.99,
];

const GENRE_OPTIONS = [
  "Action",
  "Adventure",
  "RPG",
  "Strategy",
  "Simulation",
  "Indie",
  "Casual",
  "Sports",
  "Racing",
  "Arcade",
  "Fighting",
  "Shooter",
  "Horror",
  "Puzzle",
] as const;

const CATEGORY_OPTIONS = ["Single-Player", "VR", "FPS", "Multi-player"] as const;

function formatUsd(price: number) {
  return `$${price.toFixed(2)}`;
}

function pseudoOriginalPrice(steamAppId: number) {
  const idx = Math.abs(steamAppId) % PRICE_POINTS.length;
  return PRICE_POINTS[idx];
}

function steamHeaderUrl(app: SteamApp) {
  return (
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
      <Image
        src={card.image}
        alt={card.title}
        fill
        sizes="(min-width: 1280px) 240px, (min-width: 1024px) 220px, (min-width: 640px) 45vw, 100vw"
        className="object-cover"
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

function normalizeSort(value: string): SortKey {
  const normalized = value.trim().toLowerCase();
  switch (normalized) {
    case "popular":
    case "price_asc":
    case "price_desc":
    case "discount_desc":
    case "name_asc":
      return normalized as SortKey;
    case "relevance":
    default:
      return "relevance";
  }
}

function normalizePlatform(value: string): PlatformFilter {
  const normalized = value.trim().toLowerCase();
  if (normalized === "windows" || normalized === "mac" || normalized === "linux") {
    return normalized;
  }
  return "";
}

function parseFloatParam(value: string | undefined) {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return parsed;
}

function parseIntParam(value: string | undefined) {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.floor(parsed);
}

function hashToUnit(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash / 0xffffffff;
}

function toPriceMeta(
  details: SteamAppStoreDetails | null,
  fallbackUsd: number,
  storePromos: StorePromotion[]
): {
  price: string;
  originalPrice?: string;
  discount?: string;
  effectiveUsd: number;
  originalUsd?: number;
  discountPercent: number;
  hasDeal: boolean;
  knownPrice: boolean;
} {
  if (details?.is_free) {
    return {
      price: "Free",
      originalPrice: undefined,
      discount: undefined,
      effectiveUsd: 0,
      originalUsd: undefined,
      discountPercent: 0,
      hasDeal: false,
      knownPrice: true,
    };
  }

  const steamDiscountPercent = details?.price_overview?.discount_percent ?? 0;
  const finalFormatted = details?.price_overview?.final_formatted;
  const initialFormatted = details?.price_overview?.initial_formatted;

  const finalUsd = centsToUsd(details?.price_overview?.final);
  const initialUsd = centsToUsd(details?.price_overview?.initial);
  const knownPrice = typeof finalUsd === "number";

  const baseFinalUsd = typeof finalUsd === "number" ? finalUsd : fallbackUsd;
  const baseOriginalUsd =
    steamDiscountPercent > 0 && typeof initialUsd === "number" ? initialUsd : baseFinalUsd;

  const basePriceLabel = finalFormatted || formatUsd(baseFinalUsd);
  const baseOriginalLabel =
    steamDiscountPercent > 0 ? initialFormatted || formatUsd(baseOriginalUsd) : undefined;
  const baseDiscountLabel = steamDiscountPercent > 0 ? `-${steamDiscountPercent}%` : undefined;

  if (knownPrice) {
    const storeApplied = applyStorePromotionsToUsd(baseFinalUsd, storePromos);
    if (storeApplied.discountLabel && storeApplied.priceUsd < baseFinalUsd) {
      const totalPercent =
        baseOriginalUsd > 0
          ? Math.round((1 - storeApplied.priceUsd / baseOriginalUsd) * 100)
          : steamDiscountPercent;
      const discountLabel = storeApplied.discountLabel.startsWith("-$")
        ? storeApplied.discountLabel
        : `-${totalPercent}%`;

      return {
        price: formatUsd(storeApplied.priceUsd),
        originalPrice: baseOriginalLabel ?? formatUsd(baseOriginalUsd),
        discount: discountLabel,
        effectiveUsd: storeApplied.priceUsd,
        originalUsd: baseOriginalUsd,
        discountPercent: Math.max(0, totalPercent),
        hasDeal: true,
        knownPrice: true,
      };
    }
  }

  return {
    price: basePriceLabel,
    originalPrice: baseOriginalLabel,
    discount: baseDiscountLabel,
    effectiveUsd: baseFinalUsd,
    originalUsd: steamDiscountPercent > 0 ? baseOriginalUsd : undefined,
    discountPercent: Math.max(0, steamDiscountPercent),
    hasDeal: steamDiscountPercent > 0,
    knownPrice,
  };
}

function matchesCategoryFilter(details: SteamAppStoreDetails | null, category: string) {
  const normalized = category.trim().toLowerCase();
  if (!normalized) return true;

  if (normalized === "single-player" || normalized === "single player") {
    return hasCategory(details ?? undefined, "single-player");
  }

  if (normalized === "vr") {
    return hasCategory(details ?? undefined, "vr");
  }

  if (normalized === "fps") {
    return (
      hasGenre(details ?? undefined, "action") &&
      (hasCategory(details ?? undefined, "pvp") ||
        hasCategory(details ?? undefined, "multi-player") ||
        hasCategory(details ?? undefined, "online pvp"))
    );
  }

  return hasCategory(details ?? undefined, normalized);
}

function matchesPlatform(details: SteamAppStoreDetails | null, platform: PlatformFilter) {
  if (!platform) return true;
  const platforms = details?.platforms;
  if (!platforms) return false;
  if (platform === "windows") return Boolean(platforms.windows);
  if (platform === "mac") return Boolean(platforms.mac);
  if (platform === "linux") return Boolean(platforms.linux);
  return true;
}

function buildBrowseHref(params: {
  q?: string;
  genre?: string;
  category?: string;
  sort?: SortKey;
  platform?: PlatformFilter;
  minPrice?: number;
  maxPrice?: number;
  minReviews?: number;
  deals?: boolean;
  page?: number;
}) {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.genre) sp.set("genre", params.genre);
  if (params.category) sp.set("category", params.category);
  if (params.sort && params.sort !== "relevance") sp.set("sort", params.sort);
  if (params.platform) sp.set("platform", params.platform);
  if (typeof params.minPrice === "number" && Number.isFinite(params.minPrice)) {
    sp.set("minPrice", String(params.minPrice));
  }
  if (typeof params.maxPrice === "number" && Number.isFinite(params.maxPrice)) {
    sp.set("maxPrice", String(params.maxPrice));
  }
  if (typeof params.minReviews === "number" && Number.isFinite(params.minReviews)) {
    sp.set("minReviews", String(params.minReviews));
  }
  if (params.deals) sp.set("deals", "1");
  if (typeof params.page === "number" && params.page > 1) sp.set("page", String(params.page));

  const qs = sp.toString();
  return qs ? `/browse?${qs}` : "/browse";
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams> | SearchParams;
}) {
  const resolvedParams = await Promise.resolve(searchParams ?? {});
  const q = (readParam(resolvedParams, "q") ?? "").trim();
  const genre = (readParam(resolvedParams, "genre") ?? "").trim();
  const category = (readParam(resolvedParams, "category") ?? "").trim();
  const sort = normalizeSort(readParam(resolvedParams, "sort") ?? "relevance");
  const platform = normalizePlatform(readParam(resolvedParams, "platform") ?? "");
  const minPriceRaw = parseFloatParam(readParam(resolvedParams, "minPrice"));
  const maxPriceRaw = parseFloatParam(readParam(resolvedParams, "maxPrice"));
  const minPrice = typeof minPriceRaw === "number" ? Math.max(0, minPriceRaw) : undefined;
  const maxPrice = typeof maxPriceRaw === "number" ? Math.max(0, maxPriceRaw) : undefined;
  const minReviewsRaw = parseIntParam(readParam(resolvedParams, "minReviews"));
  const minReviews = typeof minReviewsRaw === "number" ? Math.max(0, minReviewsRaw) : undefined;
  const deals = (readParam(resolvedParams, "deals") ?? "").trim();
  const dealsOnly = deals === "1" || deals.toLowerCase() === "true" || deals.toLowerCase() === "yes";
  const pageRaw = readParam(resolvedParams, "page") ?? "1";
  const pageNumberRaw = Number(pageRaw);
  const page = Number.isFinite(pageNumberRaw) ? Math.max(1, Math.floor(pageNumberRaw)) : 1;

  const maxSkipGuessRaw = Number(
    process.env.STEAM_APPS_MAX_SKIP ?? process.env.NEXT_PUBLIC_STEAM_APPS_MAX_SKIP ?? "85000"
  );
  const maxSkipGuess = Number.isFinite(maxSkipGuessRaw) ? maxSkipGuessRaw : 85000;

  const limit = 24;
  const hasFilter = Boolean(genre || category);
  const storePromos = await fetchActiveStorePromotions();

  const needsDetails =
    hasFilter ||
    Boolean(platform || dealsOnly) ||
    typeof minPrice === "number" ||
    typeof maxPrice === "number" ||
    typeof minReviews === "number" ||
    sort !== "relevance";

  const requiresKnownPrice =
    dealsOnly ||
    typeof minPrice === "number" ||
    typeof maxPrice === "number" ||
    sort === "price_asc" ||
    sort === "price_desc" ||
    sort === "discount_desc";

  let apiHadResults = false;
  let cardsMeta: CardWithMeta[] = [];
  let couldHaveMore = false;

  if (!hasFilter) {
    const skipBase = (page - 1) * limit;
    const windowSize = needsDetails ? Math.min(96, limit * 4) : limit;
    const targetCount = sort === "relevance" ? limit : Math.min(limit * 3, 72);
    const maxWindows = needsDetails ? 2 : 1;

    for (let windowIndex = 0; windowIndex < maxWindows; windowIndex += 1) {
      if (cardsMeta.length >= targetCount) break;

      const steamApps = await fetchSteamApps({
        search: q ? q : undefined,
        skip: skipBase + windowIndex * windowSize,
        limit: windowSize,
      });

      if (steamApps.length > 0) apiHadResults = true;
      if (steamApps.length === windowSize) couldHaveMore = true;
      if (steamApps.length === 0) break;

      if (!needsDetails) {
        cardsMeta = steamApps.map((app) => {
          const base = pseudoOriginalPrice(app.steamAppId);
          const applied = applyStorePromotionsToUsd(base, storePromos);
          const effectiveUsd = applied.discountLabel && applied.priceUsd < base ? applied.priceUsd : base;
          const hasDeal = Boolean(applied.discountLabel && applied.priceUsd < base);
          const discountPercent =
            hasDeal && base > 0 ? Math.max(0, Math.round((1 - effectiveUsd / base) * 100)) : 0;

          return {
            steamAppId: app.steamAppId,
            title: app.name,
            price: formatUsd(effectiveUsd),
            originalPrice: hasDeal ? formatUsd(base) : undefined,
            discount: hasDeal ? applied.discountLabel ?? undefined : undefined,
            image: steamHeaderUrl(app),
            effectiveUsd,
            originalUsd: hasDeal ? base : undefined,
            discountPercent,
            hasDeal,
            recommendationsTotal: 0,
            titleSort: app.name.trim().toLowerCase(),
          };
        });
        couldHaveMore = steamApps.length === windowSize;
        break;
      }

      const detailsMap = await fetchSteamAppDetailsBatch(
        steamApps.map((app) => app.steamAppId),
        { revalidateSeconds: 60 * 10, concurrency: 6 }
      );

      for (const app of steamApps) {
        if (cardsMeta.length >= targetCount) break;

        const details = detailsMap.get(app.steamAppId) ?? null;
        const fallback = pseudoOriginalPrice(app.steamAppId);
        const pricing = toPriceMeta(details, fallback, storePromos);
        const recommendationsTotal = details?.recommendations?.total ?? 0;

        if (requiresKnownPrice && !pricing.knownPrice) continue;
        if (platform && !matchesPlatform(details, platform)) continue;
        if (typeof minReviews === "number" && recommendationsTotal < minReviews) continue;
        if (dealsOnly && !pricing.hasDeal) continue;
        if (typeof minPrice === "number" && pricing.effectiveUsd < minPrice) continue;
        if (typeof maxPrice === "number" && pricing.effectiveUsd > maxPrice) continue;

        const title = details?.name?.trim() || app.name;
        cardsMeta.push({
          steamAppId: app.steamAppId,
          title,
          price: pricing.price,
          originalPrice: pricing.originalPrice,
          discount: pricing.discount,
          image: details?.header_image ?? steamHeaderUrl(app),
          effectiveUsd: pricing.effectiveUsd,
          originalUsd: pricing.originalUsd,
          discountPercent: pricing.discountPercent,
          hasDeal: pricing.hasDeal,
          recommendationsTotal,
          titleSort: title.trim().toLowerCase(),
        });
      }

      if (steamApps.length < windowSize) break;
    }
  } else {
    const seedBase = `q=${q}|genre=${genre}|category=${category}|page=${page}|sort=${sort}|platform=${platform}|deals=${dealsOnly}`;
    const batchSize = 16;
    const maxSkip = Math.max(maxSkipGuess - batchSize, 0);
    const attempts = 12;
    const targetCount = sort === "relevance" ? limit : Math.min(limit * 3, 72);

    const seenIds = new Set<number>();

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      if (cardsMeta.length >= targetCount) break;

      const skip = maxSkip > 0 ? Math.floor(hashToUnit(`${seedBase}|${attempt}`) * (maxSkip + 1)) : 0;
      const steamApps = await fetchSteamApps({
        search: q ? q : undefined,
        skip,
        limit: batchSize,
      });

      if (steamApps.length > 0) apiHadResults = true;
      if (steamApps.length === 0) continue;

      const detailsMap = await fetchSteamAppDetailsBatch(
        steamApps.map((app) => app.steamAppId),
        { revalidateSeconds: 60 * 10, concurrency: 6 }
      );

      for (const app of steamApps) {
        if (cardsMeta.length >= targetCount) break;
        if (seenIds.has(app.steamAppId)) continue;
        seenIds.add(app.steamAppId);

        const details = detailsMap.get(app.steamAppId) ?? null;
        if (genre && !hasGenre(details ?? undefined, genre)) continue;
        if (category && !matchesCategoryFilter(details, category)) continue;
        if (platform && !matchesPlatform(details, platform)) continue;

        const fallback = pseudoOriginalPrice(app.steamAppId);
        const pricing = toPriceMeta(details, fallback, storePromos);
        const recommendationsTotal = details?.recommendations?.total ?? 0;

        if (requiresKnownPrice && !pricing.knownPrice) continue;
        if (typeof minReviews === "number" && recommendationsTotal < minReviews) continue;
        if (dealsOnly && !pricing.hasDeal) continue;
        if (typeof minPrice === "number" && pricing.effectiveUsd < minPrice) continue;
        if (typeof maxPrice === "number" && pricing.effectiveUsd > maxPrice) continue;

        const title = details?.name?.trim() || app.name;
        cardsMeta.push({
          steamAppId: app.steamAppId,
          title,
          price: pricing.price,
          originalPrice: pricing.originalPrice,
          discount: pricing.discount,
          image: details?.header_image ?? steamHeaderUrl(app),
          effectiveUsd: pricing.effectiveUsd,
          originalUsd: pricing.originalUsd,
          discountPercent: pricing.discountPercent,
          hasDeal: pricing.hasDeal,
          recommendationsTotal,
          titleSort: title.trim().toLowerCase(),
        });
      }
    }
  }

  const sortedMeta = (() => {
    if (sort === "relevance") return cardsMeta;
    const copy = [...cardsMeta];
    copy.sort((a, b) => {
      if (sort === "popular") {
        return b.recommendationsTotal - a.recommendationsTotal || a.titleSort.localeCompare(b.titleSort);
      }
      if (sort === "price_asc") {
        return a.effectiveUsd - b.effectiveUsd || a.titleSort.localeCompare(b.titleSort);
      }
      if (sort === "price_desc") {
        return b.effectiveUsd - a.effectiveUsd || a.titleSort.localeCompare(b.titleSort);
      }
      if (sort === "discount_desc") {
        return b.discountPercent - a.discountPercent || b.recommendationsTotal - a.recommendationsTotal;
      }
      if (sort === "name_asc") {
        return a.titleSort.localeCompare(b.titleSort);
      }
      return 0;
    });
    return copy;
  })();

  const cards = sortedMeta.slice(0, limit).map((card) => {
    const { effectiveUsd, originalUsd, discountPercent, hasDeal, recommendationsTotal, titleSort, ...plain } =
      card;
    return plain;
  });

  const showApiHint = !apiHadResults && cards.length === 0 && !q;
  const hasNext = hasFilter ? sortedMeta.length >= limit : couldHaveMore;

  const prevHref = buildBrowseHref({
    q,
    genre,
    category,
    sort,
    platform,
    minPrice,
    maxPrice,
    minReviews,
    deals: dealsOnly,
    page: Math.max(1, page - 1),
  });

  const nextHref = buildBrowseHref({
    q,
    genre,
    category,
    sort,
    platform,
    minPrice,
    maxPrice,
    minReviews,
    deals: dealsOnly,
    page: page + 1,
  });

  const resetHref = "/browse";
  const filterLabel = (() => {
    const labels: string[] = [];
    if (genre) labels.push(`Genre: ${genre}`);
    if (category) labels.push(`Category: ${category}`);
    if (platform) labels.push(`Platform: ${platform}`);
    if (typeof minPrice === "number" || typeof maxPrice === "number") {
      labels.push(
        `Price: ${typeof minPrice === "number" ? formatUsd(minPrice) : "Any"} - ${
          typeof maxPrice === "number" ? formatUsd(maxPrice) : "Any"
        }`
      );
    }
    if (typeof minReviews === "number" && minReviews > 0) labels.push(`Min reviews: ${minReviews}`);
    if (dealsOnly) labels.push("Deals only");
    return labels.length ? labels.join(" | ") : null;
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
              autoComplete="off"
              className="h-12 w-full rounded-xl bg-[#1b1a55] px-4 text-white placeholder:text-white/60 outline-none focus:ring-2 focus:ring-white/30 sm:max-w-xl"
            />
            {genre ? <input type="hidden" name="genre" value={genre} /> : null}
            {category ? <input type="hidden" name="category" value={category} /> : null}
            {sort !== "relevance" ? <input type="hidden" name="sort" value={sort} /> : null}
            {platform ? <input type="hidden" name="platform" value={platform} /> : null}
            {typeof minPrice === "number" ? (
              <input type="hidden" name="minPrice" value={String(minPrice)} />
            ) : null}
            {typeof maxPrice === "number" ? (
              <input type="hidden" name="maxPrice" value={String(maxPrice)} />
            ) : null}
            {typeof minReviews === "number" ? (
              <input type="hidden" name="minReviews" value={String(minReviews)} />
            ) : null}
            {dealsOnly ? <input type="hidden" name="deals" value="1" /> : null}
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
              {page}
              {filterLabel ? (
                <>
                  {" "}
                  · <span className="font-semibold text-white">{filterLabel}</span>
                </>
              ) : null}
              )
            </p>
          ) : (
            <p className="text-sm text-white/70">
              {filterLabel ? (
                <>
                  <span className="font-semibold text-white">{filterLabel}</span> (page {page})
                </>
              ) : (
                <>Page {page}</>
              )}
            </p>
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
                <p className="font-semibold text-white">No games found.</p>
                <p className="mt-1">
                  Try a different search or{" "}
                  <Link href={resetHref} className="text-cyan-300 underline underline-offset-2">
                    reset filters
                  </Link>
                  .
                </p>
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

          <aside className="w-full max-w-xs rounded-2xl bg-[#0c143d] p-5 shadow-xl lg:sticky lg:top-6">
            <form action="/browse" method="get" className="space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-semibold">Filters</h3>
                <Link href={resetHref} className="text-sm text-cyan-300">
                  Reset
                </Link>
              </div>

              {filterLabel ? (
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
                  Active: <span className="font-semibold text-white">{filterLabel}</span>
                </div>
              ) : null}
              <div className="space-y-2">
                <label htmlFor="browseKeywords" className="text-sm font-semibold text-white/80">
                  Keywords
                </label>
                <input
                  id="browseKeywords"
                  name="q"
                  defaultValue={q}
                  placeholder="Search games..."
                  autoComplete="off"
                  className="h-11 w-full rounded-xl bg-[#1b1a55] px-4 text-sm text-white placeholder:text-white/60 outline-none focus:ring-2 focus:ring-white/30"
                />
              </div>

              <div className="grid gap-4">
                <div className="space-y-2">
                  <label htmlFor="browseSort" className="text-sm font-semibold text-white/80">
                    Sort by
                  </label>
                  <select
                    id="browseSort"
                    name="sort"
                    defaultValue={sort}
                    className="h-11 w-full rounded-xl bg-[#1b1a55] px-4 text-sm text-white outline-none focus:ring-2 focus:ring-white/30"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="popular">Popularity (reviews)</option>
                    <option value="discount_desc">Biggest discount</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="name_asc">Name: A to Z</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="browseGenre" className="text-sm font-semibold text-white/80">
                    Genre
                  </label>
                  <select
                    id="browseGenre"
                    name="genre"
                    defaultValue={genre}
                    className="h-11 w-full rounded-xl bg-[#1b1a55] px-4 text-sm text-white outline-none focus:ring-2 focus:ring-white/30"
                  >
                    <option value="">Any</option>
                    {GENRE_OPTIONS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="browseCategory" className="text-sm font-semibold text-white/80">
                    Category
                  </label>
                  <select
                    id="browseCategory"
                    name="category"
                    defaultValue={category}
                    className="h-11 w-full rounded-xl bg-[#1b1a55] px-4 text-sm text-white outline-none focus:ring-2 focus:ring-white/30"
                  >
                    <option value="">Any</option>
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-white/80">Price (USD)</label>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      name="minPrice"
                      defaultValue={typeof minPrice === "number" ? String(minPrice) : ""}
                      placeholder="Min"
                      inputMode="decimal"
                      className="h-11 w-full rounded-xl bg-[#1b1a55] px-4 text-sm text-white placeholder:text-white/60 outline-none focus:ring-2 focus:ring-white/30"
                    />
                    <input
                      name="maxPrice"
                      defaultValue={typeof maxPrice === "number" ? String(maxPrice) : ""}
                      placeholder="Max"
                      inputMode="decimal"
                      className="h-11 w-full rounded-xl bg-[#1b1a55] px-4 text-sm text-white placeholder:text-white/60 outline-none focus:ring-2 focus:ring-white/30"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="browsePlatform" className="text-sm font-semibold text-white/80">
                    Platform
                  </label>
                  <select
                    id="browsePlatform"
                    name="platform"
                    defaultValue={platform}
                    className="h-11 w-full rounded-xl bg-[#1b1a55] px-4 text-sm text-white outline-none focus:ring-2 focus:ring-white/30"
                  >
                    <option value="">Any</option>
                    <option value="windows">Windows</option>
                    <option value="mac">Mac</option>
                    <option value="linux">Linux</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="browseMinReviews" className="text-sm font-semibold text-white/80">
                    Ratings (min reviews)
                  </label>
                  <input
                    id="browseMinReviews"
                    name="minReviews"
                    defaultValue={typeof minReviews === "number" ? String(minReviews) : ""}
                    placeholder="e.g. 5000"
                    inputMode="numeric"
                    className="h-11 w-full rounded-xl bg-[#1b1a55] px-4 text-sm text-white placeholder:text-white/60 outline-none focus:ring-2 focus:ring-white/30"
                  />
                  <p className="text-xs text-white/55">
                    Uses Steam “reviews count” as a proxy for popularity.
                  </p>
                </div>

                <label className="flex items-center gap-2 text-sm text-white/80">
                  <input
                    type="checkbox"
                    name="deals"
                    value="1"
                    defaultChecked={dealsOnly}
                    className="h-4 w-4 accent-cyan-300"
                  />
                  Deals only
                </label>
              </div>

              <button
                type="submit"
                className="h-11 w-full rounded-xl bg-white text-sm font-semibold text-[#1b1a55] shadow transition hover:bg-white/95"
              >
                Apply Filters
              </button>
            </form>
          </aside>
        </div>
      </div>
    </div>
  );
}
