import { NextResponse } from "next/server";
import { gameStoreApiUrl } from "@/lib/game-store-api";
import { fetchSteamApps } from "@/lib/steam-apps";
import { fetchSteamAppDetailsBatch } from "@/lib/steam-store";
import { applyStorePromotionsToUsd, fetchActiveStorePromotions } from "@/lib/store-promotions";

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

  const [steamApps, gameData, storePromos] = await Promise.all([
    fetchSteamApps({ search: q, limit }),
    fetchJson(gameStoreApiUrl(`/games?search=${encodeURIComponent(q)}&limit=${limit}`)),
    fetchActiveStorePromotions(),
  ]);

  const steamDetails = await fetchSteamAppDetailsBatch(
    steamApps.map((app) => app.steamAppId),
    { filters: ["price_overview", "is_free", "steam_appid"], revalidateSeconds: 60 * 15 }
  );

  const steamItems: SearchItem[] = steamApps.slice(0, limit).map((app) => {
    const store = steamDetails.get(app.steamAppId);
    const isFree = Boolean(store?.is_free);
    const steamDiscountPercent = store?.price_overview?.discount_percent ?? 0;

    const finalCents = store?.price_overview?.final;
    const initialCents = store?.price_overview?.initial;
    const finalUsd = typeof finalCents === "number" ? finalCents / 100 : null;
    const initialUsd = typeof initialCents === "number" ? initialCents / 100 : null;

    let discountPercent: number | null = steamDiscountPercent ? steamDiscountPercent : null;
    let price =
      (isFree
        ? "Free"
        : store?.price_overview?.final_formatted ||
          formatUsdCents(finalCents)) ?? null;

    let originalPrice: string | null =
      steamDiscountPercent > 0
        ? store?.price_overview?.initial_formatted || formatUsdCents(initialCents)
        : null;

    if (!isFree && typeof finalUsd === "number") {
      const storeApplied = applyStorePromotionsToUsd(finalUsd, storePromos);
      if (storeApplied.discountLabel && storeApplied.priceUsd < finalUsd) {
        const originalUsd = typeof initialUsd === "number" && steamDiscountPercent > 0 ? initialUsd : finalUsd;
        if (!originalPrice) originalPrice = `$${originalUsd.toFixed(2)}`;
        price = `$${storeApplied.priceUsd.toFixed(2)}`;
        discountPercent = originalUsd > 0 ? Math.round((1 - storeApplied.priceUsd / originalUsd) * 100) : null;
      }
    }

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

