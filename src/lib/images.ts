// Single place that turns a database image_key into a usable <img> src.
import imgBurger from "@/assets/menu-burger.jpg";
import imgPizza from "@/assets/menu-pizza.jpg";
import imgShawarma from "@/assets/menu-shawarma.jpg";
import imgFries from "@/assets/menu-fries.jpg";
import imgZinger from "@/assets/menu-zinger.jpg";
import imgWrap from "@/assets/menu-wrap.jpg";

const IMAGE_MAP: Record<string, string> = {
  burger: imgBurger,
  pizza: imgPizza,
  shawarma: imgShawarma,
  fries: imgFries,
  zinger: imgZinger,
  wrap: imgWrap,
};

/**
 * Owner-uploaded photos are stored as full URLs, older seeds as short keys.
 * Anything unknown falls back to a brand photo so a card never renders broken.
 */
export function resolveImg(key: string): string {
  if (!key) return imgBurger;
  if (/^(https?:|data:|blob:|\/)/.test(key)) return key;
  return IMAGE_MAP[key] ?? imgBurger;
}
