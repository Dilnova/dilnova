import type { StorefrontProps } from "./types";
import DilstarHardwareStorefront from "./DilstarHardwareStorefront";
import DilstarNurseryStorefront from "./DilstarNurseryStorefront";
import DilstarTechStorefront from "./DilstarTechStorefront";
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
  // Primary Dilstar Sub-Vendor Portals
  "dilstar-hardware": DilstarHardwareStorefront,
  "dilstar-nursery": DilstarNurseryStorefront,
  "dilstar-tech": DilstarTechStorefront,
  "dilstar-services": DilstarServicesStorefront,

  // Backward compatibility alias mappings
  "distar-hardware": DilstarHardwareStorefront,
  "distar-nursery": DilstarNurseryStorefront,
  "distar-tech": DilstarTechStorefront,
};
