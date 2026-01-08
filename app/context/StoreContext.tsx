"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";
import { useAuth } from "@/app/context/AuthContext";
import { gameStoreApiUrl } from "@/lib/game-store-api";

export type StoreItemInput = {
  steamAppId?: number;
  slug?: string;
  name: string;
  image: string;
  priceLabel?: string | null;
  originalPriceLabel?: string | null;
};

export type StoreItem = StoreItemInput & {
  id: string;
  unitPriceCents: number | null;
};

export type CartLine = StoreItem & {
  quantity: number;
};

type StoreState = {
  cart: CartLine[];
  wishlist: StoreItem[];
  wishlistError: string | null;
  cartError: string | null;
  cartHydrated: boolean;
  wishlistHydrated: boolean;
};

type Action =
  | { type: "SET_CART"; payload: { cart: CartLine[] } }
  | { type: "SET_CART_ERROR"; payload: { error: string | null } }
  | { type: "SET_WISHLIST"; payload: { wishlist: StoreItem[] } }
  | { type: "SET_WISHLIST_ERROR"; payload: { error: string | null } }
  | { type: "REMOVE_WISHLIST"; payload: { id: string } };

const STORAGE_KEY = "gameverse_store_v1";

function parsePriceToCents(value?: string | null): number | null {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  if (trimmed.toLowerCase() === "free") return 0;

  // Try to find the first decimal number in the string.
  const match = trimmed.match(/(\d+[.,]?\d{0,2})/);
  if (!match) return null;
  const normalized = match[1].replace(",", ".");
  const numberValue = Number(normalized);
  if (!Number.isFinite(numberValue)) return null;
  return Math.round(numberValue * 100);
}

function makeItemId(input: StoreItemInput): string {
  if (typeof input.steamAppId === "number" && Number.isFinite(input.steamAppId)) {
    return `steam:${Math.floor(input.steamAppId)}`;
  }
  if (input.slug) return `slug:${input.slug}`;
  return `item:${input.name}`;
}

function fallbackImage(input: StoreItemInput): string | null {
  const trimmed = (input.image ?? "").trim();
  if (trimmed) return trimmed;
  if (typeof input.steamAppId === "number" && Number.isFinite(input.steamAppId)) {
    const id = Math.floor(input.steamAppId);
    return `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${id}/header.jpg`;
  }
  return null;
}

function normalizeItem(input: StoreItemInput): StoreItem {
  const id = makeItemId(input);
  const priceLabel = input.priceLabel ?? null;
  const unitPriceCents = parsePriceToCents(priceLabel);
  const image = fallbackImage(input);

  return {
    ...input,
    priceLabel,
    originalPriceLabel: input.originalPriceLabel ?? null,
    image: image ?? "",
    id,
    unitPriceCents,
  };
}

function extractWishlistPayload(input: unknown) {
  if (Array.isArray(input)) return input;
  if (input && typeof input === "object" && Array.isArray((input as any).wishlist)) {
    return (input as any).wishlist as unknown[];
  }
  return [];
}

function normalizeWishlistFromApi(input: unknown): StoreItem[] {
  const list = extractWishlistPayload(input);
  const out: StoreItem[] = [];

  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const record = raw as Partial<StoreItem>;

    const base: StoreItemInput = {
      steamAppId:
        typeof record.steamAppId === "number" && Number.isFinite(record.steamAppId)
          ? Math.floor(record.steamAppId)
          : undefined,
      slug: typeof record.slug === "string" ? record.slug : undefined,
      name: typeof record.name === "string" ? record.name : "Unknown game",
      image: typeof record.image === "string" ? record.image : "",
      priceLabel: typeof record.priceLabel === "string" ? record.priceLabel : null,
      originalPriceLabel:
        typeof record.originalPriceLabel === "string" ? record.originalPriceLabel : null,
    };

    const normalized = normalizeItem(base);
    const id = typeof record.id === "string" && record.id.trim() ? record.id : normalized.id;
    const unitPriceCents =
      typeof record.unitPriceCents === "number" && Number.isFinite(record.unitPriceCents)
        ? Math.floor(record.unitPriceCents)
        : normalized.unitPriceCents;

    out.push({ ...normalized, id, unitPriceCents });
  }

  return out;
}

function extractCartPayload(input: unknown) {
  if (Array.isArray(input)) return input;
  if (input && typeof input === "object" && Array.isArray((input as any).cart)) {
    return (input as any).cart as unknown[];
  }
  return [];
}

function normalizeCartFromApi(input: unknown): CartLine[] {
  const list = extractCartPayload(input);
  const out: CartLine[] = [];

  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const record = raw as Partial<CartLine>;
    const base: StoreItemInput = {
      steamAppId:
        typeof record.steamAppId === "number" && Number.isFinite(record.steamAppId)
          ? Math.floor(record.steamAppId)
          : undefined,
      slug: typeof record.slug === "string" ? record.slug : undefined,
      name: typeof record.name === "string" ? record.name : "Unknown game",
      image: typeof record.image === "string" ? record.image : "",
      priceLabel: typeof record.priceLabel === "string" ? record.priceLabel : null,
      originalPriceLabel:
        typeof record.originalPriceLabel === "string" ? record.originalPriceLabel : null,
    };
    const normalized = normalizeItem(base);
    const id = typeof record.id === "string" && record.id.trim() ? record.id : normalized.id;
    const unitPriceCents =
      typeof record.unitPriceCents === "number" && Number.isFinite(record.unitPriceCents)
        ? Math.floor(record.unitPriceCents)
        : normalized.unitPriceCents;
    const quantity =
      typeof record.quantity === "number" && Number.isFinite(record.quantity)
        ? clampQuantity(record.quantity)
        : 1;
    out.push({ ...normalized, id, unitPriceCents, quantity });
  }

  return out;
}

function extractApiErrorMessage(input: unknown): string | null {
  if (!input || typeof input !== "object") return null;
  const message = (input as any)?.error?.message ?? (input as any)?.message;
  return typeof message === "string" && message.trim() ? message : null;
}

function clampQuantity(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(99, Math.floor(value)));
}

function reducer(state: StoreState, action: Action): StoreState {
  switch (action.type) {
    case "SET_CART":
      return {
        ...state,
        cart: action.payload.cart,
        cartError: null,
        cartHydrated: true,
      };

    case "SET_CART_ERROR":
      return {
        ...state,
        cartError: action.payload.error,
        cartHydrated: true,
      };

    case "SET_WISHLIST":
      return {
        ...state,
        wishlist: action.payload.wishlist,
        wishlistError: null,
        wishlistHydrated: true,
      };

    case "SET_WISHLIST_ERROR":
      return {
        ...state,
        wishlistError: action.payload.error,
        wishlistHydrated: true,
      };

    case "REMOVE_WISHLIST":
      return {
        ...state,
        wishlist: state.wishlist.filter((item) => item.id !== action.payload.id),
      };

    default:
      return state;
  }
}

const StoreContext = createContext<{
  cart: CartLine[];
  wishlist: StoreItem[];
  wishlistError: string | null;
  cartError: string | null;
  cartHydrated: boolean;
  wishlistHydrated: boolean;
  cartCount: number;
  wishlistCount: number;
  subtotalCents: number;
  addToCart: (input: StoreItemInput, quantity?: number) => void;
  removeFromCart: (id: string) => void;
  setCartQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  isWishlisted: (input: StoreItemInput | StoreItem) => boolean;
  toggleWishlist: (input: StoreItemInput) => void;
  removeWishlist: (id: string) => void;
  clearWishlist: () => void;
} | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { token, user, logout } = useAuth();
  const [state, dispatch] = useReducer(reducer, {
    cart: [],
    wishlist: [],
    wishlistError: null,
    cartError: null,
    cartHydrated: false,
    wishlistHydrated: false,
  });

  useEffect(() => {
    let active = true;

    const canSyncCart = Boolean(token) && Boolean(user) && user?.accountType === "customer";
    if (!canSyncCart) {
      dispatch({ type: "SET_CART", payload: { cart: [] } });
      return () => {
        active = false;
      };
    }

    (async () => {
      try {
        const res = await fetch(gameStoreApiUrl("/customers/me/cart"), {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          const message = extractApiErrorMessage(data);
          if (res.status === 401) {
            logout();
            return;
          }
          dispatch({ type: "SET_CART_ERROR", payload: { error: message || "Failed to load cart." } });
          dispatch({ type: "SET_CART", payload: { cart: [] } });
          return;
        }
        if (!active) return;
        dispatch({ type: "SET_CART", payload: { cart: normalizeCartFromApi(data) } });
      } catch (err) {
        console.error(err);
        if (!active) return;
        dispatch({ type: "SET_CART_ERROR", payload: { error: "Failed to load cart. Please try again." } });
        dispatch({ type: "SET_CART", payload: { cart: [] } });
      }
    })();

    return () => {
      active = false;
    };
  }, [logout, token, user]);

  useEffect(() => {
    let active = true;

    const canSyncWishlist = Boolean(token) && Boolean(user) && user?.accountType === "customer";

    if (!canSyncWishlist) {
      dispatch({ type: "SET_WISHLIST", payload: { wishlist: [] } });
      dispatch({ type: "SET_WISHLIST_ERROR", payload: { error: null } });
      return () => {
        active = false;
      };
    }

    (async () => {
      try {
        const res = await fetch(gameStoreApiUrl("/customers/me/wishlist"), {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          const message = extractApiErrorMessage(data);
          if (res.status === 401) {
            logout();
            return;
          }
          if (res.status === 403) {
            if (!active) return;
            dispatch({ type: "SET_WISHLIST", payload: { wishlist: [] } });
            dispatch({
              type: "SET_WISHLIST_ERROR",
              payload: { error: "Wishlist is available for customer accounts only." },
            });
            return;
          }
          if (res.status === 404) {
            if (!active) return;
            dispatch({ type: "SET_WISHLIST", payload: { wishlist: [] } });
            dispatch({
              type: "SET_WISHLIST_ERROR",
              payload: {
                error:
                  "Wishlist endpoint not found on backend. Pull latest `game-store-api` and restart it.",
              },
            });
            return;
          }
          if (!active) return;
          dispatch({ type: "SET_WISHLIST", payload: { wishlist: [] } });
          dispatch({
            type: "SET_WISHLIST_ERROR",
            payload: {
              error: message || `Failed to load wishlist (HTTP ${res.status}).`,
            },
          });
          return;
        }
        if (!active) return;
        dispatch({ type: "SET_WISHLIST", payload: { wishlist: normalizeWishlistFromApi(data) } });
        dispatch({ type: "SET_WISHLIST_ERROR", payload: { error: null } });
      } catch (err) {
        console.error(err);
        if (!active) return;
        dispatch({ type: "SET_WISHLIST", payload: { wishlist: [] } });
        dispatch({
          type: "SET_WISHLIST_ERROR",
          payload: { error: "Failed to load wishlist. Please try again." },
        });
      }
    })();

    return () => {
      active = false;
    };
  }, [logout, token, user]);

  const cartCount = useMemo(
    () => state.cart.reduce((acc, line) => acc + line.quantity, 0),
    [state.cart]
  );

  const subtotalCents = useMemo(() => {
    return state.cart.reduce((acc, line) => {
      if (typeof line.unitPriceCents !== "number") return acc;
      return acc + line.unitPriceCents * line.quantity;
    }, 0);
  }, [state.cart]);

  const wishlistIds = useMemo(() => new Set(state.wishlist.map((w) => w.id)), [state.wishlist]);

  const addToCart = useCallback(
    (input: StoreItemInput, quantity = 1) => {
      if (!token || !user || user.accountType !== "customer") return;
      const item = normalizeItem(input);
      const payload: Record<string, unknown> = {
        item: {
          id: item.id,
          steamAppId: item.steamAppId,
          slug: item.slug,
          name: item.name,
          image: item.image,
          priceLabel: item.priceLabel ?? undefined,
          originalPriceLabel: item.originalPriceLabel ?? undefined,
          unitPriceCents: item.unitPriceCents ?? undefined,
        },
        quantity: clampQuantity(quantity),
      };
      void (async () => {
        try {
          const res = await fetch(gameStoreApiUrl("/customers/me/cart"), {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });
          const data = await res.json().catch(() => null);
          if (!res.ok) {
            if (res.status === 401) {
              logout();
              return;
            }
            const message = extractApiErrorMessage(data);
            dispatch({ type: "SET_CART_ERROR", payload: { error: message || "Failed to update cart." } });
            return;
          }
          dispatch({ type: "SET_CART", payload: { cart: normalizeCartFromApi(data) } });
        } catch (err) {
          console.error(err);
        }
      })();
    },
    [logout, token, user]
  );

  const removeFromCart = useCallback(
    (id: string) => {
      // Always update local state immediately
      dispatch({
        type: "SET_CART",
        payload: {
          cart: state.cart.filter((line) => line.id !== id),
        },
      });

      // Sync with API only for logged-in customers
      if (!token || !user || user.accountType !== "customer") return;
      const url = gameStoreApiUrl(`/customers/me/cart/${encodeURIComponent(id)}`);
      void (async () => {
        try {
          const res = await fetch(url, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
          const data = await res.json().catch(() => null);
          if (!res.ok) {
            if (res.status === 401) {
              logout();
              return;
            }
            const message = extractApiErrorMessage(data);
            dispatch({ type: "SET_CART_ERROR", payload: { error: message || "Failed to update cart." } });
            return;
          }
          dispatch({ type: "SET_CART", payload: { cart: normalizeCartFromApi(data) } });
        } catch (err) {
          console.error(err);
        }
      })();
    },
    [logout, state.cart, token, user]
  );

  const setCartQuantity = useCallback(
    (id: string, quantity: number) => {
      if (!token || !user || user.accountType !== "customer") return;
      const url = gameStoreApiUrl(`/customers/me/cart/${encodeURIComponent(id)}`);
      const body = JSON.stringify({ quantity: clampQuantity(quantity) });
      void (async () => {
        try {
          const res = await fetch(url, {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body,
          });
          const data = await res.json().catch(() => null);
          if (!res.ok) {
            if (res.status === 401) {
              logout();
              return;
            }
            const message = extractApiErrorMessage(data);
            dispatch({ type: "SET_CART_ERROR", payload: { error: message || "Failed to update cart." } });
            return;
          }
          dispatch({ type: "SET_CART", payload: { cart: normalizeCartFromApi(data) } });
        } catch (err) {
          console.error(err);
        }
      })();
    },
    [logout, token, user]
  );

  const clearCart = useCallback(() => {
    if (!token || !user || user.accountType !== "customer") return;
    void (async () => {
      try {
        const res = await fetch(gameStoreApiUrl("/customers/me/cart"), {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          if (res.status === 401) {
            logout();
            return;
          }
          const message = extractApiErrorMessage(data);
          dispatch({ type: "SET_CART_ERROR", payload: { error: message || "Failed to clear cart." } });
          return;
        }
        dispatch({ type: "SET_CART", payload: { cart: normalizeCartFromApi(data) } });
      } catch (err) {
        console.error(err);
      }
    })();
  }, [logout, token, user]);

  const isWishlisted = useCallback(
    (input: StoreItemInput | StoreItem) => {
      const id = "id" in input ? input.id : makeItemId(input);
      return wishlistIds.has(id);
    },
    [wishlistIds]
  );

  const toggleWishlist = useCallback((input: StoreItemInput) => {
    if (!token || !user || user.accountType !== "customer") return;
    const item = normalizeItem(input);
    if (!item.image.trim()) {
      dispatch({
        type: "SET_WISHLIST_ERROR",
        payload: { error: "Cannot add to wishlist: missing game image." },
      });
      return;
    }
    const exists = wishlistIds.has(item.id);
    const url = exists
      ? gameStoreApiUrl(`/customers/me/wishlist/${encodeURIComponent(item.id)}`)
      : gameStoreApiUrl("/customers/me/wishlist");

    const payload: Record<string, unknown> = {
      id: item.id,
      steamAppId: item.steamAppId,
      slug: item.slug,
      name: item.name,
      image: item.image,
      priceLabel: item.priceLabel ?? undefined,
      originalPriceLabel: item.originalPriceLabel ?? undefined,
    };
    if (typeof item.unitPriceCents === "number") {
      payload.unitPriceCents = item.unitPriceCents;
    }

    void (async () => {
      try {
        const res = await fetch(url, {
          method: exists ? "DELETE" : "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            ...(exists ? {} : { "Content-Type": "application/json" }),
          },
          body: exists ? undefined : JSON.stringify(payload),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          const message = extractApiErrorMessage(data);
          if (res.status === 401) {
            logout();
            return;
          }
          dispatch({
            type: "SET_WISHLIST_ERROR",
            payload: { error: message || `Failed to update wishlist (HTTP ${res.status}).` },
          });
          return;
        }
        dispatch({ type: "SET_WISHLIST", payload: { wishlist: normalizeWishlistFromApi(data) } });
      } catch (err) {
        console.error(err);
      }
    })();
  }, [logout, token, user, wishlistIds]);

  const removeWishlist = useCallback((id: string) => {
    if (!token || !user || user.accountType !== "customer") return;
    const url = gameStoreApiUrl(`/customers/me/wishlist/${encodeURIComponent(id)}`);
    void (async () => {
      try {
        const res = await fetch(url, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          const message = extractApiErrorMessage(data);
          if (res.status === 401) {
            logout();
            return;
          }
          throw new Error(message || `Failed to remove wishlist item (HTTP ${res.status}).`);
        }
        dispatch({ type: "SET_WISHLIST", payload: { wishlist: normalizeWishlistFromApi(data) } });
      } catch (err) {
        console.error(err);
      }
    })();
  }, [logout, token, user]);

  const clearWishlist = useCallback(() => {
    if (!token || !user || user.accountType !== "customer") return;
    void (async () => {
      try {
        const res = await fetch(gameStoreApiUrl("/customers/me/wishlist"), {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          const message = extractApiErrorMessage(data);
          if (res.status === 401) {
            logout();
            return;
          }
          throw new Error(message || `Failed to clear wishlist (HTTP ${res.status}).`);
        }
        dispatch({ type: "SET_WISHLIST", payload: { wishlist: normalizeWishlistFromApi(data) } });
      } catch (err) {
        console.error(err);
      }
    })();
  }, [logout, token, user]);

  const value = useMemo(
    () => ({
      cart: state.cart,
      wishlist: state.wishlist,
      wishlistError: state.wishlistError,
      cartError: state.cartError ?? null,
      cartHydrated: state.cartHydrated,
      wishlistHydrated: state.wishlistHydrated,
      cartCount,
      wishlistCount: state.wishlist.length,
      subtotalCents,
      addToCart,
      removeFromCart,
      setCartQuantity,
      clearCart,
      isWishlisted,
      toggleWishlist,
      removeWishlist,
      clearWishlist,
    }),
    [
      addToCart,
      cartCount,
      clearCart,
      clearWishlist,
      isWishlisted,
      removeFromCart,
      removeWishlist,
      setCartQuantity,
      state.cart,
      state.cartHydrated,
      state.cartError,
      state.wishlist,
      state.wishlistError,
      state.wishlistHydrated,
      subtotalCents,
      toggleWishlist,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error("useStore must be used within StoreProvider");
  }
  return ctx;
}

