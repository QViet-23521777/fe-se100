import { NextResponse } from "next/server";
import { fetchSteamApps } from "@/lib/steam-apps";
import { fetchSteamAppDetailsBatch } from "@/lib/steam-store";

function formatUsdCents(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return `$${(value / 100).toFixed(2)}`;
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
  const details = await fetchSteamAppDetailsBatch(
    results.map((app) => app.steamAppId),
    { filters: ["price_overview", "is_free", "steam_appid"], revalidateSeconds: 60 * 15 }
  );

  return NextResponse.json(
    results.map((app) => {
      const store = details.get(app.steamAppId);
      const isFree = Boolean(store?.is_free);
      const discountPercent = store?.price_overview?.discount_percent ?? null;

      const price =
        (isFree
          ? "Free"
          : store?.price_overview?.final_formatted ||
            formatUsdCents(store?.price_overview?.final)) ?? null;

      const originalPrice =
        discountPercent && discountPercent > 0
          ? store?.price_overview?.initial_formatted ||
            formatUsdCents(store?.price_overview?.initial) ||
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
