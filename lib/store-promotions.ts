import { gameStoreApiUrl } from "@/lib/game-store-api";

export type StorePromotion = {
  promotionName: string;
  discountType: "Percentage" | "FixedAmount" | string;
  applicationCondition: string;
  applicableScope: "AllGames" | string;
  scope?: "Store" | "Publisher" | string;
  status?: string;
  startDate?: string;
  expirationDate?: string;
  endDate?: string;
};

function parseNumericValue(input: unknown): number | null {
  if (typeof input === "number" && Number.isFinite(input)) return input;
  if (typeof input !== "string") return null;
  const match = input.match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const value = Number(match[0]);
  if (!Number.isFinite(value)) return null;
  return value;
}

export function applyStorePromotionsToUsd(
  usd: number,
  promos: StorePromotion[]
): { priceUsd: number; discountLabel: string | null } {
  if (!Number.isFinite(usd) || usd <= 0) return { priceUsd: usd, discountLabel: null };
  if (!Array.isArray(promos) || promos.length === 0) return { priceUsd: usd, discountLabel: null };

  let best = usd;
  let bestLabel: string | null = null;

  for (const promo of promos) {
    if (!promo) continue;
    const scope = String(promo.scope ?? "Publisher");
    if (scope !== "Store") continue;
    if (promo.applicableScope && promo.applicableScope !== "AllGames") continue;

    const raw = parseNumericValue(promo.applicationCondition);
    if (raw === null) continue;

    if (promo.discountType === "Percentage") {
      const percent = Math.max(0, Math.min(100, Math.abs(raw)));
      const discounted = Math.max(0, Math.round(usd * (1 - percent / 100) * 100) / 100);
      if (discounted < best) {
        best = discounted;
        bestLabel = `-${Math.round(percent)}%`;
      }
      continue;
    }

    if (promo.discountType === "FixedAmount") {
      const amount = Math.max(0, Math.abs(raw));
      const discounted = Math.max(0, Math.round((usd - amount) * 100) / 100);
      if (discounted < best) {
        best = discounted;
        bestLabel = `-$${amount.toFixed(2)}`;
      }
    }
  }

  return { priceUsd: best, discountLabel: bestLabel };
}

export async function fetchActiveStorePromotions(): Promise<StorePromotion[]> {
  try {
    const res = await fetch(gameStoreApiUrl("/promotions/store/active"), {
      // keep this dynamic so changes show immediately
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json().catch(() => null)) as any;
    return Array.isArray(data) ? (data as StorePromotion[]) : [];
  } catch {
    return [];
  }
}

