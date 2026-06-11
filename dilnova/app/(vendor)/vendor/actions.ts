'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { revalidateVendorConsole } from '@/utils/revalidateVendorConsole';
import { vendorMetadataSchema } from '@/utils/schemas';
import { logAuditAction } from '@/utils/auditLogger';
import { logger } from '@/utils/logger';
import { runWithCorrelationId } from '@/utils/asyncContext';

interface VendorMetadataInput {
  description: string;
  address: string;
  phone: string;
  bannerUrl: string;
  stockAllocationMode?: 'target_branch' | 'central_intake';
}

/**
 * Secures and updates the organization's public metadata (company profile fields) in Clerk.
 * Restricted to users who belong to the organization and hold either an admin or vendor role.
 */
export async function updateVendorMetadata(organizationId: string, data: VendorMetadataInput) {
  return runWithCorrelationId(async () => {
    // ── Schema Validation ──
    const parsed = vendorMetadataSchema.safeParse({ organizationId, data });
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || 'Invalid input.');
    }

    const { orgId, orgRole, userId } = await auth();

    // 1. Authenticate: Verify the user is logged in and belongs to the requested organization
    if (!orgId || orgId !== parsed.data.organizationId) {
      throw new Error('Not authorized: You do not belong to this organization.');
    }

    // 2. Authorize: Only organization admins can update storefront profile settings
    if (orgRole !== 'org:admin') {
      throw new Error('Not authorized: Only organization admins can configure profile settings.');
    }

    const client = await clerkClient();
    const org = await client.organizations.getOrganization({ organizationId: parsed.data.organizationId });
    const existingMeta = (org.publicMetadata || {}) as Record<string, unknown>;

    // 3. Merge profile fields into existing organization metadata
    await client.organizations.updateOrganization(parsed.data.organizationId, {
      publicMetadata: {
        ...existingMeta,
        description: parsed.data.data.description,
        address: parsed.data.data.address,
        phone: parsed.data.data.phone,
        bannerUrl: parsed.data.data.bannerUrl,
        stockAllocationMode: parsed.data.data.stockAllocationMode,
      },
    });

    // 4. Audit Logging
    if (userId) {
      await logAuditAction({
        userId,
        action: 'UPDATE_VENDOR_METADATA',
        targetType: 'vendor',
        targetId: parsed.data.organizationId,
        metadata: {
          description: parsed.data.data.description,
          address: parsed.data.data.address,
          phone: parsed.data.data.phone,
          bannerUrl: parsed.data.data.bannerUrl,
          stockAllocationMode: parsed.data.data.stockAllocationMode,
        },
      });
    }

    // 5. Cache Revalidation: ensure changes are immediately visible
    revalidatePath('/');
    revalidateVendorConsole();
    revalidatePath('/vendors');
    
    // Revalidate the vendor's profile page using its slug
    try {
      const org = await client.organizations.getOrganization({ organizationId: parsed.data.organizationId });
      if (org.slug) {
        revalidatePath(`/vendors/${org.slug}`);
      }
    } catch (err) {
      logger.error('Error fetching org slug for path revalidation:', err);
    }

    return { success: true };
  });
}
