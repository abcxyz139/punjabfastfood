/** Canonical public origin, used for canonical tags and the sitemap. */
export const SITE_URL = "https://punjabfastfood.lovable.app";

export function canonical(path = "/") {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
