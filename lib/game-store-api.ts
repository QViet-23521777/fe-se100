const DEFAULT_BASE_URL = "http://localhost:3000";

export const GAME_STORE_API_BASE_URL =
  process.env.NEXT_PUBLIC_GAME_STORE_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  DEFAULT_BASE_URL;

export function gameStoreApiUrl(path: string) {
  const base = GAME_STORE_API_BASE_URL.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}
