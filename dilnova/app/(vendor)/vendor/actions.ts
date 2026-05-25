'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';

interface VendorMetadataInput {
  description: string;
  address: string;
  phone: string;
  bannerUrl: string;
}

/**
 * Secures and updates the organization's public metadata (company profile fields) in Clerk.
 * Restricted to users who belong to the organization and hold either an admin or vendor role.
 */
export async function updateVendorMetadata(organizationId: string, data: VendorMetadataInput) {
  const { orgId, orgRole } = await auth();

  // 1. Authenticate: Verify the user is logged in and belongs to the requested organization
  if (!orgId || orgId !== organizationId) {
    throw new Error('Not authorized: You do not belong to this organization.');
  }

  // 2. Authorize: Verify the user has administrative or vendor permissions in the organization
  if (orgRole !== 'org:admin' && orgRole !== 'org:vendor') {
    throw new Error('Not authorized: Only vendors or administrators can configure profile settings.');
  }

  // 3. Sanitization & Validation
  const description = data.description?.slice(0, 1000).trim() || '';
  const address = data.address?.slice(0, 250).trim() || '';
  const phone = data.phone?.slice(0, 50).trim() || '';
  const bannerUrl = data.bannerUrl?.trim() || '';

  if (bannerUrl && !bannerUrl.startsWith('http://') && !bannerUrl.startsWith('https://')) {
    throw new Error('Invalid URL format: Banner URL must begin with http:// or https://');
  }

  const client = await clerkClient();

  // 4. Update the organization's public metadata in Clerk
  await client.organizations.updateOrganizationMetadata(organizationId, {
    publicMetadata: {
      description,
      address,
      phone,
      bannerUrl,
    },
  });

  // 5. Cache Revalidation: ensure changes are immediately visible
  revalidatePath('/');
  revalidatePath('/vendor');
  revalidatePath('/vendors');
  
  // Revalidate the vendor's profile page using its slug
  try {
    const org = await client.organizations.getOrganization({ organizationId });
    if (org.slug) {
      revalidatePath(`/vendors/${org.slug}`);
    }
  } catch (err) {
    console.error('Error fetching org slug for path revalidation:', err);
  }

  return { success: true };
}
