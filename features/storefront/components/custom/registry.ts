import type { StorefrontProps } from "./types";
import DistarHardwareStorefront from "./DistarHardwareStorefront";
import DistarNurseryStorefront from "./DistarNurseryStorefront";
import DistarTechStorefront from "./DistarTechStorefront";
import DilstarServicesStorefront from "./DilstarServicesStorefront";

/**
 * ═══════════════════════════════════════════════════════════════
 * CUSTOM STOREFRONT REGISTRY
 * ═══════════════════════════════════════════════════════════════
 * Maps vendor slugs to their custom storefront components.
 *
 * To add a new custom vendor page:
 *   1. Create a new file in this directory (e.g., MyVendorStorefront.tsx)
 *   2. Import it above
 *   3. Add one line below: 'my-vendor-slug': MyVendorStorefront
 *
 * Vendors NOT listed here will use the DefaultStorefront.
 * ═══════════════════════════════════════════════════════════════
 */
export const customStorefronts: Record<string, React.ComponentType<StorefrontProps>> = {
  "distar-hardware": DistarHardwareStorefront,
  "distar-nursery": DistarNurseryStorefront,
  "distar-tech": DistarTechStorefront,
  "dilstar-services": DilstarServicesStorefront,
  // Add more custom vendor pages here...
  // 'vendor-slug': VendorStorefrontComponent,
};
