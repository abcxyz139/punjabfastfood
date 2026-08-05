// Guest cart persisted in localStorage and shared by every storefront surface.
import { useEffect, useState } from "react";
import type { CartEntry } from "./menu.types";

export const CART_KEY = "pff:cart2";
export const PAST_KEY = "pff:past2";

export function entryKey(
  menuItemId: string,
  variantId: string | null,
  addonIds: string[],
  notes?: string | null,
) {
  return [menuItemId, variantId ?? "-", ...[...addonIds].sort(), notes?.trim() || "-"].join("|");
}

export function readCart(key: string): CartEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(key) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw.filter(
      (e) => e && typeof e === "object" && typeof e.menuItemId === "string",
    ) as CartEntry[];
  } catch {
    return [];
  }
}

export function writeCart(key: string, v: CartEntry[]) {
  localStorage.setItem(key, JSON.stringify(v));
  window.dispatchEvent(new CustomEvent("pff:storage"));
}

export function addEntry(entry: Omit<CartEntry, "key">) {
  const key = entryKey(entry.menuItemId, entry.variantId, entry.addonIds, entry.notes);
  const cart = readCart(CART_KEY);
  const idx = cart.findIndex((e) => e.key === key);
  if (idx >= 0) {
    cart[idx] = { ...cart[idx], quantity: cart[idx].quantity + entry.quantity };
  } else {
    cart.push({ ...entry, key });
  }
  writeCart(CART_KEY, cart);
}

export function updateCartQty(key: string, delta: number) {
  const cart = readCart(CART_KEY);
  const idx = cart.findIndex((e) => e.key === key);
  if (idx < 0) return;
  const next = cart[idx].quantity + delta;
  if (next <= 0) cart.splice(idx, 1);
  else cart[idx] = { ...cart[idx], quantity: next };
  writeCart(CART_KEY, cart);
}

export function removeCartEntry(key: string) {
  writeCart(
    CART_KEY,
    readCart(CART_KEY).filter((e) => e.key !== key),
  );
}

/** Live cart + past-order lists, kept in sync across tabs and components. */
export function useCartState() {
  const [cart, setCart] = useState<CartEntry[]>([]);
  const [past, setPast] = useState<CartEntry[]>([]);
  useEffect(() => {
    const sync = () => {
      setCart(readCart(CART_KEY));
      setPast(readCart(PAST_KEY));
    };
    sync();
    window.addEventListener("pff:storage", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("pff:storage", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return { cart, past, setCart, setPast };
}
