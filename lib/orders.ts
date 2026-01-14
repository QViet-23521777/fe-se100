import type { CartLine } from "@/app/context/StoreContext";

export type PaymentBrand = "wallet" | "visa" | "mastercard" | "paypal" | "payoneer";

export type OrderRecord = {
  id: string;
  createdAt: string;
  totalCents: number;
  items: CartLine[];
  payment: {
    brand: PaymentBrand;
    last4?: string;
    holder?: string;
  };
  status: "paid";
};

const ORDERS_KEY = "gameverse_orders_v1";

function readOrders(): OrderRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ORDERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as OrderRecord[];
  } catch {
    return [];
  }
}

function writeOrders(orders: OrderRecord[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  } catch {
    // ignore write errors (storage full / disabled)
  }
}

export function getOrders(): OrderRecord[] {
  return readOrders();
}

export function addOrder(order: OrderRecord) {
  const current = readOrders();
  const next = [order, ...current].slice(0, 50); // cap history
  writeOrders(next);
}
