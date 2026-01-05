import { gameStoreApiUrl } from "@/lib/game-store-api";

export type SteamApp = {
  id: string;
  name: string;
  genre?: string;
  description?: string;
  imageUrl?: string;
  videoUrl?: string;
  releaseDate?: string;
  publisherId?: string;
  platforms?: string;
  version?: string;
  originalPrice?: number;
  discountPrice?: number;
  createdAt?: string;
  updatedAt?: string;
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
  if (search?.trim()) query.set("search", search.trim());

  try {
    const res = await fetch(gameStoreApiUrl(`/games?${query.toString()}`), {
      cache: "no-store",
    });
    if (!res.ok) return [];
    return normalizeSteamApps(await res.json());
  } catch (err) {
    console.error("Failed to fetch games:", err);
    return [];
  }
}

export async function fetchSteamAppById(id: string): Promise<SteamApp | null> {
  if (!id) return null;

  try {
    // ĐỔI ENDPOINT
    const res = await fetch(gameStoreApiUrl(`/games/${id}`), {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as any;

    // Normalize common field names from the game-store API so callers
    // (product page, search) can rely on `avatarUrl` and `detailsUrl`.
    if (data) {
      if (!data.avatarUrl && data.imageUrl) data.avatarUrl = data.imageUrl;
      if (!data.imageUrl && data.avatarUrl) data.imageUrl = data.avatarUrl;
    }

    return data as SteamApp;
  } catch {
    return null;
  }
}

export async function fetchRandomSteamApps({
  limit = 24,
}: {
  limit?: number;
} = {}): Promise<SteamApp[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  return fetchSteamApps({ limit: safeLimit });
}
