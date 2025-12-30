"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";

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
  hydrated: boolean;
};

type Action =
  | { type: "HYDRATE"; payload: { cart: CartLine[]; wishlist: StoreItem[] } }
  | { type: "ADD_TO_CART"; payload: { item: StoreItem; quantity: number } }
  | { type: "REMOVE_FROM_CART"; payload: { id: string } }
  | { type: "SET_CART_QTY"; payload: { id: string; quantity: number } }
  | { type: "CLEAR_CART" }
  | { type: "TOGGLE_WISHLIST"; payload: { item: StoreItem } }
  | { type: "REMOVE_WISHLIST"; payload: { id: string } }
  | { type: "CLEAR_WISHLIST" };

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

function normalizeItem(input: StoreItemInput): StoreItem {
  const id = makeItemId(input);
  const priceLabel = input.priceLabel ?? null;
  const unitPriceCents = parsePriceToCents(priceLabel);

  return {
    ...input,
    priceLabel,
    originalPriceLabel: input.originalPriceLabel ?? null,
    id,
    unitPriceCents,
  };
}

function clampQuantity(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(99, Math.floor(value)));
}

function reducer(state: StoreState, action: Action): StoreState {
  switch (action.type) {
    case "HYDRATE":
      return {
        cart: action.payload.cart,
        wishlist: action.payload.wishlist,
        hydrated: true,
      };

    case "ADD_TO_CART": {
      const quantity = clampQuantity(action.payload.quantity);
      const existingIdx = state.cart.findIndex(
        (line) => line.id === action.payload.item.id
      );
      if (existingIdx >= 0) {
        const next = [...state.cart];
        const current = next[existingIdx];
        next[existingIdx] = {
          ...current,
          quantity: clampQuantity(current.quantity + quantity),
        };
        return { ...state, cart: next };
      }
      return {
        ...state,
        cart: [...state.cart, { ...action.payload.item, quantity }],
      };
    }

    case "REMOVE_FROM_CART":
      return { ...state, cart: state.cart.filter((line) => line.id !== action.payload.id) };

    case "SET_CART_QTY": {
      const quantity = Math.floor(action.payload.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        return { ...state, cart: state.cart.filter((line) => line.id !== action.payload.id) };
      }
      return {
        ...state,
        cart: state.cart.map((line) =>
          line.id === action.payload.id ? { ...line, quantity: clampQuantity(quantity) } : line
        ),
      };
    }

    case "CLEAR_CART":
      return { ...state, cart: [] };

    case "TOGGLE_WISHLIST": {
      const exists = state.wishlist.some((item) => item.id === action.payload.item.id);
      if (exists) {
        return {
          ...state,
          wishlist: state.wishlist.filter((item) => item.id !== action.payload.item.id),
        };
      }
      return { ...state, wishlist: [action.payload.item, ...state.wishlist] };
    }

    case "REMOVE_WISHLIST":
      return {
        ...state,
        wishlist: state.wishlist.filter((item) => item.id !== action.payload.id),
      };

    case "CLEAR_WISHLIST":
      return { ...state, wishlist: [] };

    default:
      return state;
  }
}

const StoreContext = createContext<{
  cart: CartLine[];
  wishlist: StoreItem[];
  hydrated: boolean;
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
  const [state, dispatch] = useReducer(reducer, {
    cart: [],
    wishlist: [],
    hydrated: false,
  });

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        dispatch({ type: "HYDRATE", payload: { cart: [], wishlist: [] } });
        return;
      }

      const parsed = JSON.parse(raw) as Partial<{
        cart: CartLine[];
        wishlist: StoreItem[];
      }>;

      const cart = Array.isArray(parsed.cart) ? parsed.cart : [];
      const wishlist = Array.isArray(parsed.wishlist) ? parsed.wishlist : [];
      dispatch({ type: "HYDRATE", payload: { cart, wishlist } });
    } catch {
      dispatch({ type: "HYDRATE", payload: { cart: [], wishlist: [] } });
    }
  }, []);

  useEffect(() => {
    if (!state.hydrated) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ cart: state.cart, wishlist: state.wishlist })
      );
    } catch {
      // ignore
    }
  }, [state.cart, state.hydrated, state.wishlist]);

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
      const item = normalizeItem(input);
      dispatch({ type: "ADD_TO_CART", payload: { item, quantity } });
    },
    []
  );

  const removeFromCart = useCallback((id: string) => {
    dispatch({ type: "REMOVE_FROM_CART", payload: { id } });
  }, []);

  const setCartQuantity = useCallback((id: string, quantity: number) => {
    dispatch({ type: "SET_CART_QTY", payload: { id, quantity } });
  }, []);

  const clearCart = useCallback(() => dispatch({ type: "CLEAR_CART" }), []);

  const isWishlisted = useCallback(
    (input: StoreItemInput | StoreItem) => {
      const id = "id" in input ? input.id : makeItemId(input);
      return wishlistIds.has(id);
    },
    [wishlistIds]
  );

  const toggleWishlist = useCallback((input: StoreItemInput) => {
    dispatch({ type: "TOGGLE_WISHLIST", payload: { item: normalizeItem(input) } });
  }, []);

  const removeWishlist = useCallback((id: string) => {
    dispatch({ type: "REMOVE_WISHLIST", payload: { id } });
  }, []);

  const clearWishlist = useCallback(() => dispatch({ type: "CLEAR_WISHLIST" }), []);

  const value = useMemo(
    () => ({
      cart: state.cart,
      wishlist: state.wishlist,
      hydrated: state.hydrated,
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
      state.hydrated,
      state.wishlist,
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

