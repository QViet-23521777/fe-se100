export type SteamGenre = { id: string; description: string };
export type SteamCategory = { id: number; description: string };

export type SteamPriceOverview = {
  currency?: string;
  initial?: number;
  final?: number;
  discount_percent?: number;
  initial_formatted?: string;
  final_formatted?: string;
};

export type SteamReleaseDate = {
  coming_soon?: boolean;
  date?: string;
};

export type SteamRecommendations = {
  total?: number;
};

export type SteamAppStoreDetails = {
  steam_appid?: number;
  name?: string;
  is_free?: boolean;
  price_overview?: SteamPriceOverview;
  release_date?: SteamReleaseDate;
  recommendations?: SteamRecommendations;
  genres?: SteamGenre[];
  categories?: SteamCategory[];
  header_image?: string;
};

type SteamAppDetailsResponse = Record<
  string,
  { success: boolean; data?: SteamAppStoreDetails }
>;

function normalizeString(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizeText(value: unknown) {
  return normalizeString(value).toLowerCase();
}

function uniqPositiveInts(values: number[]) {
  return Array.from(
    new Set(
      values
        .map((value) => (Number.isFinite(value) ? Math.floor(value) : NaN))
        .filter((value) => Number.isFinite(value) && value > 0)
    )
  );
}

export function centsToUsd(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return value / 100;
}

export function hasGenre(details: SteamAppStoreDetails | undefined, genre: string) {
  const target = normalizeText(genre);
  if (!target) return false;
  const genres = details?.genres ?? [];
  return genres.some((g) => normalizeText(g?.description) === target);
}

export function hasCategory(
  details: SteamAppStoreDetails | undefined,
  category: string
) {
  const target = normalizeText(category);
  if (!target) return false;
  const categories = details?.categories ?? [];
  return categories.some((c) => normalizeText(c?.description).includes(target));
}

async function fetchSteamAppDetailsSingle(
  steamAppId: number,
  {
    filters,
    cc,
    l,
    revalidateSeconds,
  }: {
    filters: string[];
    cc: string;
    l: string;
    revalidateSeconds: number;
  }
) {
  const url = new URL("https://store.steampowered.com/api/appdetails");
  url.searchParams.set("appids", String(steamAppId));
  url.searchParams.set("filters", filters.join(","));
  url.searchParams.set("cc", cc);
  url.searchParams.set("l", l);

  try {
    const res = await fetch(url.toString(), {
      next: { revalidate: Math.max(0, Math.floor(revalidateSeconds)) },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as SteamAppDetailsResponse;
    const entry = data?.[String(steamAppId)];
    if (!entry?.success || !entry.data) return null;
    return entry.data;
  } catch {
    return null;
  }
}

async function mapWithConcurrency<T, R>(
  input: T[],
  concurrency: number,
  mapper: (value: T) => Promise<R>
) {
  const results: R[] = [];
  const queue = [...input];
  const safeConcurrency = Math.max(1, Math.floor(concurrency));

  async function worker() {
    while (queue.length > 0) {
      const value = queue.shift();
      if (value === undefined) return;
      results.push(await mapper(value));
    }
  }

  await Promise.all(Array.from({ length: safeConcurrency }, () => worker()));
  return results;
}

export async function fetchSteamAppDetailsBatch(
  steamAppIds: number[],
  {
    filters = [
      "price_overview",
      "is_free",
      "recommendations",
      "release_date",
      "genres",
      "categories",
      "header_image",
      "steam_appid",
      "name",
    ],
    cc = "us",
    l = "english",
    revalidateSeconds = 60 * 15,
    concurrency = 6,
  }: {
    filters?: string[];
    cc?: string;
    l?: string;
    revalidateSeconds?: number;
    concurrency?: number;
  } = {}
) {
  const uniqueIds = uniqPositiveInts(steamAppIds);
  if (uniqueIds.length === 0) return new Map<number, SteamAppStoreDetails>();

  const safeRevalidate = Math.max(0, Math.floor(revalidateSeconds));
  const safeConcurrency = Math.max(1, Math.min(12, Math.floor(concurrency)));

  const details = await mapWithConcurrency(
    uniqueIds,
    safeConcurrency,
    async (steamAppId) => {
      const data = await fetchSteamAppDetailsSingle(steamAppId, {
        filters,
        cc,
        l,
        revalidateSeconds: safeRevalidate,
      });
      return { steamAppId, data };
    }
  );

  const map = new Map<number, SteamAppStoreDetails>();
  for (const entry of details) {
    if (!entry.data) continue;
    map.set(entry.steamAppId, entry.data);
  }
  return map;
}
