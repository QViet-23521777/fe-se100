import { NextResponse } from "next/server";
import { fetchSteamApps } from "@/lib/steam-apps";

type SteamAppDetails = {
  is_free?: boolean;
  price_overview?: {
    initial?: number;
    final?: number;
    discount_percent?: number;
    initial_formatted?: string;
    final_formatted?: string;
  };
};

type SteamAppDetailsResponse = Record<
  string,
  { success: boolean; data?: SteamAppDetails }
>;

function formatUsdCents(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return `$${(value / 100).toFixed(2)}`;
}

async function fetchSteamPrices(steamAppIds: number[]) {
  const unique = Array.from(new Set(steamAppIds)).filter(
    (id) => Number.isFinite(id) && id > 0
  );
  if (unique.length === 0) return new Map<number, SteamAppDetails>();

  const url = new URL("https://store.steampowered.com/api/appdetails");
  url.searchParams.set("appids", unique.join(","));
  url.searchParams.set("filters", "price_overview,is_free,steam_appid");
  url.searchParams.set("cc", "us");
  url.searchParams.set("l", "english");

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 60 * 15 } });
    if (!res.ok) return new Map<number, SteamAppDetails>();

    const data = (await res.json()) as SteamAppDetailsResponse;
    const map = new Map<number, SteamAppDetails>();
    for (const [key, entry] of Object.entries(data ?? {})) {
      const id = Number(key);
      if (!Number.isFinite(id) || id <= 0) continue;
      if (!entry?.success || !entry.data) continue;
      map.set(id, entry.data);
    }
    return map;
  } catch {
    return new Map<number, SteamAppDetails>();
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = (searchParams.get("q") ?? "").trim();
  const limitRaw = Number(searchParams.get("limit") ?? "8");

  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(Math.floor(limitRaw), 1), 20)
    : 8;

  const results = await fetchSteamApps({ search: query, limit });
  const prices = await fetchSteamPrices(results.map((app) => app.steamAppId));

  return NextResponse.json(
    results.map((app) => {
      const details = prices.get(app.steamAppId);
      const isFree = Boolean(details?.is_free);
      const discountPercent = details?.price_overview?.discount_percent ?? null;

      const price =
        (isFree
          ? "Free"
          : details?.price_overview?.final_formatted ||
            formatUsdCents(details?.price_overview?.final)) ?? null;

      const originalPrice =
        discountPercent && discountPercent > 0
          ? details?.price_overview?.initial_formatted ||
            formatUsdCents(details?.price_overview?.initial) ||
            null
          : null;

      return {
        steamAppId: app.steamAppId,
        name: app.name,
        avatarUrl: app.avatarUrl,
        isFree,
        price,
        originalPrice,
        discountPercent,
      };
    })
  );
}
