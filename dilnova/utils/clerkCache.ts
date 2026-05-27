import { clerkClient } from '@clerk/nextjs/server';

export interface CachedOrg {
  id: string;
  name: string;
  slug: string | null;
  imageUrl: string;
  publicMetadata: {
    description?: string;
    address?: string;
    phone?: string;
    theme?: string;
  };
}

let cachedOrgs: CachedOrg[] | null = null;
let lastCacheFetch = 0;
const CACHE_TTL = 30 * 1000; // Cache for 30 seconds

/**
 * Retrieves the list of Clerk organizations using an in-memory cache to bypass
 * slow network API requests.
 */
export async function getCachedOrganizations(
  client: Awaited<ReturnType<typeof clerkClient>>
): Promise<CachedOrg[]> {
  // If cache is empty or expired, perform a fresh fetch
  if (!cachedOrgs || Date.now() - lastCacheFetch > CACHE_TTL) {
    console.log('[Clerk Cache] Cache miss/expired, fetching fresh organizations list from Clerk...');
    try {
      const orgList = await client.organizations.getOrganizationList({ limit: 100 });
      cachedOrgs = orgList.data.map((o) => ({
        id: o.id,
        name: o.name,
        slug: o.slug,
        imageUrl: o.imageUrl,
        publicMetadata: (o.publicMetadata as CachedOrg['publicMetadata']) || {},
      }));
      lastCacheFetch = Date.now();
    } catch (err) {
      console.error('[Clerk Cache] Failed to fetch organizations from Clerk API:', err);
      // Return stale cache if available, otherwise empty array
      return cachedOrgs || [];
    }
  } else {
    console.log('[Clerk Cache] Cache hit, reusing cached organizations list');
  }

  return cachedOrgs || [];
}

/**
 * Forces invalidation/clear of the cache (useful for admin actions).
 */
export function invalidateClerkCache() {
  cachedOrgs = null;
  lastCacheFetch = 0;
}
