/** Public storefront routes — no auth required. */
export const PUBLIC_ROUTES = ["/", "/products", "/cart", "/contact"] as const;

/** Routes guarded by Clerk middleware + layout role checks. */
export const PROTECTED_ROUTES = {
  vendor: "/vendor",
  vendorBilling: "/vendor/billing",
  admin: "/admin",
  superadmin: "/superadmin",
  customer: "/customer",
} as const;

export const UNAUTHORIZED_PATH = "/unauthorized";
export const SIGN_IN_PATH = "/sign-in";

/** Clerk Account Portal domains used when NEXT_PUBLIC_CLERK_SIGN_IN_URL is not set. */
const CLERK_PORTAL_PATTERNS = [
  "clerk.accounts.dev",
  "accounts.clerk.",
  ".clerk.com/sign-in",
] as const;

/** Returns true when the browser landed on sign-in or 403 unauthorized. */
export function isAuthWallUrl(url: string): boolean {
  return (
    url.includes(SIGN_IN_PATH) ||
    url.includes(UNAUTHORIZED_PATH) ||
    CLERK_PORTAL_PATTERNS.some((pattern) => url.includes(pattern))
  );
}
