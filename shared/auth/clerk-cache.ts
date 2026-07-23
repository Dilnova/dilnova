import { clerkClient, createClerkClient } from "@clerk/nextjs/server";
import { logger } from "@/shared/logging/logger";
import { unstable_cache, revalidateTag } from "next/cache";
import { cache } from "react";
import { isSuperAdminUser } from "@/shared/auth/superadmin.server";
import {
  sanitizeVendorPublicMetadata,
  type StorefrontPublicMetadata,
} from "@/shared/media/sanitize-vendor-public-metadata";

export interface CachedOrg {
  id: string;
  name: string;
  slug: string | null;
  imageUrl: string;
  publicMetadata: StorefrontPublicMetadata;
}

export interface CachedSuperadminOrg {
  id: string;
  name: string;
  slug: string | null;
  imageUrl: string;
  publicMetadata: Record<string, unknown>;
}

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
      (o.publicMetadata as Record<string, unknown> | undefined) ?? {},
    ),
  };
}

function mapSuperadminOrganization(o: {
  id: string;
  name: string;
  slug: string | null;
  imageUrl: string;
  publicMetadata?: unknown;
}): CachedSuperadminOrg {
  return {
    id: o.id,
    name: o.name,
    slug: o.slug,
    imageUrl: o.imageUrl,
    publicMetadata: (o.publicMetadata as Record<string, unknown> | undefined) ?? {},
  };
}

/**
 * Fetches every Clerk organization, paginating past the API's 100-item page size.
 */
export async function fetchAllClerkOrganizations(
  client: ClerkOrganizationsClient,
): Promise<CachedOrg[]> {
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

export async function fetchAllSuperadminOrganizations(
  client: ClerkOrganizationsClient,
): Promise<CachedSuperadminOrg[]> {
  const all: CachedSuperadminOrg[] = [];
  const limit = 100;
  let offset = 0;

  while (true) {
    const orgList = await client.organizations.getOrganizationList({ limit, offset });
    all.push(...orgList.data.map(mapSuperadminOrganization));
    if (orgList.data.length < limit) {
      break;
    }
    offset += limit;
  }

  return all;
}

const getCachedOrganizationsInternal = unstable_cache(
  async (): Promise<CachedOrg[]> => {
    logger.info("Clerk organization cache miss, fetching from API");
    try {
      const client = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
      return await fetchAllClerkOrganizations(client);
    } catch (err) {
      logger.error("Failed to fetch organizations from Clerk API in unstable_cache", err);
      throw err;
    }
  },
  ["clerk-organizations"],
  {
    tags: ["clerk-organizations"],
    revalidate: 300, // 5 minutes
  },
);

const getCachedSuperadminOrganizationsInternal = unstable_cache(
  async (): Promise<CachedSuperadminOrg[]> => {
    logger.info("Clerk superadmin organization cache miss, fetching from API");
    try {
      const client = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
      return await fetchAllSuperadminOrganizations(client);
    } catch (err) {
      logger.error(
        "Failed to fetch superadmin organizations from Clerk API in unstable_cache",
        err,
      );
      throw err;
    }
  },
  ["clerk-superadmin-organizations"],
  {
    tags: ["clerk-organizations", "clerk-superadmin-organizations"],
    revalidate: 300, // 5 minutes
  },
);

/**
 * Retrieves the list of Clerk organizations using Next.js unstable_cache
 * to bypass slow network API requests.
 */
export async function getCachedOrganizations(
  client?: ClerkOrganizationsClient,
): Promise<CachedOrg[]> {
  void client;
  try {
    return await getCachedOrganizationsInternal();
  } catch (err) {
    logger.error("Error fetching cached organizations, returning empty fallback", err);
    return [];
  }
}

/**
 * Retrieves the raw list of Clerk organizations using Next.js unstable_cache for superadmins.
 */
export async function getSuperadminOrganizations(
  client?: ClerkOrganizationsClient,
): Promise<CachedSuperadminOrg[]> {
  void client;
  try {
    return await getCachedSuperadminOrganizationsInternal();
  } catch (err) {
    logger.error("Error fetching cached superadmin organizations, returning empty fallback", err);
    return [];
  }
}

/**
 * Forces invalidation/clear of the cache (useful for admin actions).
 */
export function invalidateClerkCache() {
  revalidateTag("clerk-organizations", "max");
}

/**
 * Retrieves the user's public metadata role using Next.js unstable_cache
 * to bypass slow Clerk API lookups on every request.
 */
export const getCachedUserRole = cache((userId: string) =>
  unstable_cache(
    async (): Promise<string | undefined> => {
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
    ["clerk-user-role", userId],
    {
      tags: ["clerk-user-role", `clerk-user-role-${userId}`],
      revalidate: 300, // Increased TTL to 5 minutes to prevent rate limiting
    },
  )(),
);

export const getCachedIsSuperAdmin = cache((userId: string) =>
  unstable_cache(
    async (): Promise<boolean> => {
      try {
        const client = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
        const user = await client.users.getUser(userId);
        return isSuperAdminUser(user);
      } catch (err) {
        logger.error("Failed to fetch superadmin grant from Clerk", { userId, err });
        return false;
      }
    },
    ["clerk-user-superadmin", userId],
    {
      tags: ["clerk-user-superadmin", `clerk-user-superadmin-${userId}`],
      revalidate: 300, // Increased TTL to 5 minutes to prevent rate limiting
    },
  )(),
);

export const getCachedOrgMembers = cache((orgId: string) =>
  unstable_cache(
    async (): Promise<{ userId: string; name: string; email: string }[]> => {
      try {
        logger.info("Fetching organization memberships from Clerk API", { orgId });
        const client = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
        const memberships = await client.organizations.getOrganizationMembershipList({
          organizationId: orgId,
          limit: 100, // Max page size
        });
        return memberships.data
          .filter((m) => m.role !== "org:admin" && m.publicUserData?.userId)
          .map((m) => ({
            userId: m.publicUserData?.userId || "",
            name:
              `${m.publicUserData?.firstName || ""} ${m.publicUserData?.lastName || ""}`.trim() ||
              m.publicUserData?.identifier ||
              "Unknown Member",
            email: m.publicUserData?.identifier || "",
          }));
      } catch (err) {
        logger.error("Failed to fetch organization memberships from Clerk", { orgId, err });
        throw err;
      }
    },
    ["clerk-org-members", orgId],
    {
      tags: ["clerk-org-members", `clerk-org-members-${orgId}`],
      revalidate: 300, // Cache for 5 minutes
    },
  )(),
);

/**
 * Invalidates the Clerk cache for a specific user role/superadmin check.
 */
export function invalidateClerkUserCache(userId: string) {
  logger.info("Invalidating Clerk cache for user", { userId });
  revalidateTag(`clerk-user-role-${userId}`, "max");
  revalidateTag(`clerk-user-superadmin-${userId}`, "max");
}

/**
 * Invalidates the Clerk cache for organization memberships.
 */
export function invalidateClerkOrgCache(orgId: string) {
  logger.info("Invalidating Clerk cache for organization", { orgId });
  revalidateTag(`clerk-org-members-${orgId}`, "max");
  revalidateTag("clerk-organizations", "max");
}

/**
 * Checks if a user belongs to ANY organization, cached to prevent API spam.
 */
export const getCachedUserBelongsToOrg = cache((userId: string) =>
  unstable_cache(
    async (): Promise<boolean> => {
      try {
        const client = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
        const memberships = await client.users.getOrganizationMembershipList({ userId, limit: 1 });
        return memberships.data.length > 0;
      } catch (err) {
        logger.error("Failed to fetch user org memberships from Clerk", { userId, err });
        return false;
      }
    },
    ["clerk-user-has-org", userId],
    {
      tags: ["clerk-user-has-org", `clerk-user-has-org-${userId}`],
      revalidate: 300, // Cache for 5 minutes
    },
  )(),
);
