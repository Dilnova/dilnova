import { revalidatePath } from "next/cache";

/**
 * Invalidate RSC caches for vendor console routes after catalog or IMS mutations.
 * `/vendor/products` only redirects to `/vendor`; the live UI is on `/vendor` and `/vendor/billing`.
 */
export function revalidateVendorConsole() {
  revalidatePath("/vendor");
  revalidatePath("/vendor/billing");
  revalidatePath("/vendor/products");
  revalidatePath("/vendor/products/add");
}
