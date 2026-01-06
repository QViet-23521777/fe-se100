import { NextResponse } from "next/server";
import { gameStoreApiUrl } from "@/lib/game-store-api";
import { fetchSteamApps } from "@/lib/steam-apps";
import { fetchSteamAppDetailsBatch } from "@/lib/steam-store";

type SearchItem = {
  type: "steam" | "game";
  id: string;
  steamAppId?: number;
  name: string;
  avatarUrl?: string | null;
  price?: string | null;
  originalPrice?: string | null;
  discountPercent?: number | null;
  publisherName?: string | null;
};

async function fetchJson(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json().catch(() => null);
}

function formatUsdCents(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return `$${(value / 100).toFixed(2)}`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 8), 1), 20);

  if (!q || q.length < 1) return NextResponse.json([]);

  const [steamApps, gameData] = await Promise.all([
    fetchSteamApps({ search: q, limit }),
    fetchJson(gameStoreApiUrl(`/games?search=${encodeURIComponent(q)}&limit=${limit}`)),
  ]);

  const steamDetails = await fetchSteamAppDetailsBatch(
    steamApps.map((app) => app.steamAppId),
    { filters: ["price_overview", "is_free", "steam_appid"], revalidateSeconds: 60 * 15 }
  );

  const steamItems: SearchItem[] = steamApps.slice(0, limit).map((app) => {
    const store = steamDetails.get(app.steamAppId);
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
          formatUsdCents(store?.price_overview?.initial)
        : null;

    return {
      type: "steam" as const,
      id: String(app.steamAppId),
      steamAppId: app.steamAppId,
      name: app.name,
      avatarUrl: app.avatarUrl,
      price,
      originalPrice,
      discountPercent,
      publisherName: null,
    };
  });

  const gameItems: SearchItem[] = Array.isArray(gameData)
    ? gameData.slice(0, limit).map((g: any) => {
        const hasDiscount =
          typeof g.discountPrice === "number" && g.discountPrice > 0 && g.discountPrice < g.originalPrice;
        const price = hasDiscount ? `$${g.discountPrice.toFixed(2)}` : `$${(g.originalPrice ?? 0).toFixed(2)}`;
        const originalPrice = hasDiscount ? `$${(g.originalPrice ?? 0).toFixed(2)}` : null;
        return {
          type: "game" as const,
          id: g.id,
          name: g.name,
          avatarUrl: g.imageUrl,
          price,
          originalPrice,
          publisherName:
            g.publisherName ??
            g.publisher?.name ??
            g.publisher?.publisherName ??
            null,
        };
      })
    : [];

  return NextResponse.json([...gameItems, ...steamItems].slice(0, limit));
}

