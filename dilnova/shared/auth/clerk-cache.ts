import { clerkClient, createClerkClient } from '@clerk/nextjs/server';
import { logger } from '@/shared/logging/logger';
import { unstable_cache } from 'next/cache';
import { isSuperAdminUser } from '@/shared/auth/superadmin.server';
import {
  sanitizeVendorPublicMetadata,
  type StorefrontPublicMetadata,
} from '@/shared/media/sanitize-vendor-public-metadata';

export interface CachedOrg {
  id: string;
  name: string;
  slug: string | null;
  imageUrl: string;
  publicMetadata: StorefrontPublicMetadata;
}

let cachedOrgs: CachedOrg[] | null = null;
let lastCacheFetch = 0;
const CACHE_TTL = 5 * 60 * 1000; // Cache for 5 minutes

type ClerkOrganizationsClient = Awaited<ReturnType<typeof clerkClient>>;

function mapClerkOrganization(o: {
  id: string;
  name: string;
  slug: string | null;
  imageUrl: string;
  publicMetadata?: unknown;
}): CachedOrg {
  return {
    id: o.id,
    name: o.name,
    slug: o.slug,
    imageUrl: o.imageUrl,
    publicMetadata: sanitizeVendorPublicMetadata(
      (o.publicMetadata as Record<string, unknown> | undefined) ?? {}
    ),
  };
}

/**
 * Fetches every Clerk organization, paginating past the API's 100-item page size.
 */
export async function fetchAllClerkOrganizations(client: ClerkOrganizationsClient): Promise<CachedOrg[]> {
  const all: CachedOrg[] = [];
  const limit = 100;
  let offset = 0;

  while (true) {
    const orgList = await client.organizations.getOrganizationList({ limit, offset });
    all.push(...orgList.data.map(mapClerkOrganization));
    if (orgList.data.length < limit) {
      break;
    }
    offset += limit;
  }

  return all;
}

/**
 * Retrieves the list of Clerk organizations using an in-memory cache to bypass
 * slow network API requests.
 */
export async function getCachedOrganizations(client: ClerkOrganizationsClient): Promise<CachedOrg[]> {
  // If cache is empty or expired, perform a fresh fetch
  if (!cachedOrgs || Date.now() - lastCacheFetch > CACHE_TTL) {
    logger.info('Clerk organization cache miss, fetching from API');
    try {
      cachedOrgs = await fetchAllClerkOrganizations(client);
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

/**
 * Retrieves the user's public metadata role using Next.js unstable_cache
 * to bypass slow Clerk API lookups on every request.
 */
export const getCachedUserRole = unstable_cache(
  async (userId: string): Promise<string | undefined> => {
    try {
      logger.info(`Fetching role for user ${userId} from Clerk API`);
      const client = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
      const user = await client.users.getUser(userId);
      return user.publicMetadata?.role as string | undefined;
    } catch (err) {
      logger.error(`Failed to fetch user role for ${userId} from Clerk`, err);
      return undefined;
    }
  },
  ['clerk-user-role'],
  {
    tags: ['clerk-user-role'],
    revalidate: 300, // Cache for 5 minutes (300 seconds)
  }
);

export const getCachedIsSuperAdmin = unstable_cache(
  async (userId: string): Promise<boolean> => {
    try {
      const client = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
      const user = await client.users.getUser(userId);
      return isSuperAdminUser(user);
    } catch (err) {
      logger.error(`Failed to fetch superadmin grant for ${userId} from Clerk`, err);
      return false;
    }
  },
  ['clerk-user-superadmin'],
  {
    tags: ['clerk-user-superadmin'],
    revalidate: 300,
  }
);
