import type { StorefrontProps } from "./custom/types";
import BaseStorefront from "./BaseStorefront";

/**
 * Default storefront layout used by vendors without a custom page.
 * This is the standard profile view with hero banner, identity card,
 * about section, contact info, and product grid.
 */
export default function DefaultStorefront({ org, products }: StorefrontProps) {
  return <BaseStorefront org={org} products={products} />;
}
