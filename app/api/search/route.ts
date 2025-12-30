import { NextResponse } from "next/server";
import { gameStoreApiUrl } from "@/lib/game-store-api";

type SearchItem = {
  type: "steam" | "game";
  id: string;
  steamAppId?: number;
  name: string;
  avatarUrl?: string | null;
  price?: string | null;
  originalPrice?: string | null;
};

async function fetchJson(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json().catch(() => null);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 8), 1), 20);

  if (!q || q.length < 1) return NextResponse.json([]);

  const [steamData, gameData] = await Promise.all([
    fetchJson(gameStoreApiUrl(`/steam-apps?search=${encodeURIComponent(q)}&limit=${limit}`)),
    fetchJson(gameStoreApiUrl(`/games?search=${encodeURIComponent(q)}&limit=${limit}`)),
  ]);

  const steamItems: SearchItem[] = Array.isArray(steamData)
    ? steamData.slice(0, limit).map((item: any) => ({
        type: "steam" as const,
        id: String(item.steamAppId),
        steamAppId: item.steamAppId,
        name: item.name,
        avatarUrl: item.avatarUrl,
        price: item.price ?? null,
        originalPrice: item.originalPrice ?? null,
      }))
    : [];

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
        };
      })
    : [];

  return NextResponse.json([...gameItems, ...steamItems].slice(0, limit));
}

