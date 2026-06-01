import { clerkClient } from '@clerk/nextjs/server';
import { logger } from './logger';

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
    logger.info('Clerk organization cache miss, fetching from API');
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
      logger.error('Failed to fetch organizations from Clerk API', err);
      // Return stale cache if available, otherwise empty array
      return cachedOrgs || [];
    }
  } else {
    logger.info('Clerk organization cache hit, reusing cached list');
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
