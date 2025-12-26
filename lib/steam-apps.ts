import { gameStoreApiUrl } from "@/lib/game-store-api";

export type SteamApp = {
  steamAppId: number;
  name: string;
  avatarUrl?: string;
  detailsUrl?: string;
};

type FetchSteamAppsOptions = {
  search?: string;
  skip?: number;
  limit?: number;
};

function normalizeSteamApps(data: unknown): SteamApp[] {
  return Array.isArray(data) ? (data as SteamApp[]) : [];
}

export async function fetchSteamApps({
  search,
  skip = 0,
  limit = 24,
}: FetchSteamAppsOptions = {}): Promise<SteamApp[]> {
  const safeSkip = Math.max(Math.floor(skip), 0);
  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 100);

  const query = new URLSearchParams();
  query.set("skip", String(safeSkip));
  query.set("limit", String(safeLimit));
  if (search?.trim()) query.set("search", search.trim());

  try {
    const res = await fetch(gameStoreApiUrl(`/steam-apps?${query.toString()}`), {
      cache: "no-store",
    });
    if (!res.ok) return [];
    return normalizeSteamApps(await res.json());
  } catch {
    return [];
  }
}

export async function fetchSteamAppById(
  steamAppId: number
): Promise<SteamApp | null> {
  const safeId = Number.isFinite(steamAppId) ? Math.floor(steamAppId) : 0;
  if (safeId <= 0) return null;

  try {
    const res = await fetch(gameStoreApiUrl(`/steam-apps/${safeId}`), {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as SteamApp;
  } catch {
    return null;
  }
}

export async function fetchRandomSteamApps({
  limit = 24,
  maxSkipGuess = 85000,
}: {
  limit?: number;
  maxSkipGuess?: number;
} = {}): Promise<SteamApp[]> {
  const safeLimitInput = Number.isFinite(limit) ? Math.floor(limit) : 24;
  const safeLimit = Math.min(Math.max(safeLimitInput, 1), 100);

  const safeMaxSkipGuessInput = Number.isFinite(maxSkipGuess)
    ? Math.floor(maxSkipGuess)
    : 0;
  const safeMaxSkipGuess = Math.max(safeMaxSkipGuessInput, 0);
  const maxSkip = Math.max(safeMaxSkipGuess - safeLimit, 0);
  const skip = maxSkip > 0 ? Math.floor(Math.random() * (maxSkip + 1)) : 0;

  const primary = await fetchSteamApps({ skip, limit: safeLimit });
  if (primary.length > 0) return primary;
  if (skip === 0) return primary;

  return fetchSteamApps({ skip: 0, limit: safeLimit });
}
