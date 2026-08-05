// Shared storefront data hooks: menu snapshot + owner business settings.
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getPublicMenu, getPublicSettings } from "@/lib/menu.functions";

export const DEFAULT_RESTAURANT_NAME = "Punjab Fast Food";
export const DEFAULT_WHATSAPP_NUMBER = "923017160216"; // international format, no + or spaces
export const DEFAULT_DELIVERY_CHARGES = 2.5;

export function useSettings() {
  const fetchSettings = useServerFn(getPublicSettings);
  const { data } = useQuery({
    queryKey: ["public-settings"],
    queryFn: () => fetchSettings(),
    staleTime: 60_000,
  });
  return {
    restaurantName: data?.restaurantName ?? DEFAULT_RESTAURANT_NAME,
    whatsappNumber: data?.whatsappNumber ?? DEFAULT_WHATSAPP_NUMBER,
    phone: data?.phone ?? DEFAULT_WHATSAPP_NUMBER,
    deliveryCharges: data?.deliveryCharges ?? DEFAULT_DELIVERY_CHARGES,
    minOrder: data?.minOrder ?? 0,
    isOpen: data?.isOpen ?? true,
    closedMessage: data?.closedMessage ?? "",
    announcement: data?.announcement ?? "",
  };
}

export function useMenuData() {
  const fetchMenu = useServerFn(getPublicMenu);
  return useQuery({
    queryKey: ["public-menu"],
    queryFn: () => fetchMenu(),
    staleTime: 60_000,
  });
}
