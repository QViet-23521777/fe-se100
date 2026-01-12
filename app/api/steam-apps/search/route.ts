import { NextResponse } from "next/server";
import { fetchSteamApps } from "@/lib/steam-apps";
import { fetchSteamAppDetailsBatch } from "@/lib/steam-store";
import { applyStorePromotionsToUsd, fetchActiveStorePromotions } from "@/lib/store-promotions";

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

  const [results, storePromos] = await Promise.all([
    fetchSteamApps({ search: query, limit }),
    fetchActiveStorePromotions(),
  ]);
  const details = await fetchSteamAppDetailsBatch(
    results.map((app) => app.steamAppId),
    { filters: ["price_overview", "is_free", "steam_appid"], revalidateSeconds: 60 * 15 }
  );

  return NextResponse.json(
    results.map((app) => {
      const store = details.get(app.steamAppId);
      const isFree = Boolean(store?.is_free);
      const steamDiscountPercent = store?.price_overview?.discount_percent ?? 0;
      const finalCents = store?.price_overview?.final;
      const initialCents = store?.price_overview?.initial;
      const finalUsd = typeof finalCents === "number" ? finalCents / 100 : null;
      const initialUsd = typeof initialCents === "number" ? initialCents / 100 : null;

      const price =
        (isFree
          ? "Free"
          : store?.price_overview?.final_formatted ||
            formatUsdCents(finalCents)) ?? null;

      const originalPrice =
        steamDiscountPercent && steamDiscountPercent > 0
          ? store?.price_overview?.initial_formatted ||
            formatUsdCents(initialCents) ||
            null
          : null;

      let discountPercent: number | null = steamDiscountPercent ? steamDiscountPercent : null;
      let finalPrice = price;
      let finalOriginal = originalPrice;

      if (!isFree && typeof finalUsd === "number") {
        const storeApplied = applyStorePromotionsToUsd(finalUsd, storePromos);
        if (storeApplied.discountLabel && storeApplied.priceUsd < finalUsd) {
          const originalUsd =
            typeof initialUsd === "number" && steamDiscountPercent > 0 ? initialUsd : finalUsd;
          if (!finalOriginal) finalOriginal = `$${originalUsd.toFixed(2)}`;
          finalPrice = `$${storeApplied.priceUsd.toFixed(2)}`;
          discountPercent =
            originalUsd > 0 ? Math.round((1 - storeApplied.priceUsd / originalUsd) * 100) : null;
        }
      }

      return {
        steamAppId: app.steamAppId,
        name: app.name,
        avatarUrl: app.avatarUrl,
        isFree,
        price: finalPrice,
        originalPrice: finalOriginal,
        discountPercent,
      };
    })
  );
}
