/** Money helpers shared by the pricing engine, orders and the storefront. */

/** Single price display format for the whole app. */
export function formatPrice(n: number) {
  return `$${n.toFixed(2)}`;
}


/** Round to 2 decimals — the only rounding rule allowed in pricing paths. */
export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Sum a list of amounts with a single rounding step at the end. */
export function sum2(values: number[]) {
  return round2(values.reduce((s, v) => s + v, 0));
}
