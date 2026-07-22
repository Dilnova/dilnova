"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { revalidateVendorConsole } from "@/features/vendor/revalidate";
import { vendorMetadataSchema } from "@/features/vendor/schema";
import { logAuditAction } from "@/shared/audit/logger";
import { logger } from "@/shared/logging/logger";
import { runWithCorrelationId } from "@/shared/security/async-context";
import {
  buildBankPrivateMetadataFromVendorData,
  buildPublicProfileMetadataFromVendorData,
  hasBankTransferConfiguredForOrg,
  stripBankFieldsFromPublic,
} from "@/features/billing/bank-transfer-metadata";
import { isAllowedCloudinaryDeliveryUrl } from "@/shared/media/cloudinary-url";
import { rateLimit } from "@/shared/security/rate-limit";
import { requireVendorRole } from "@/shared/auth/vendor-guard";

interface VendorMetadataInput {
  description: string;
  address: string;
  phone: string;
  bannerUrl: string;
  stockAllocationMode?: "target_branch" | "central_intake";
  bankName?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankBranchCode?: string;
  bankTransferInstructions?: string;
}

/**
 * Secures and updates organization profile in Clerk.
 * Storefront fields live in publicMetadata; bank transfer details in privateMetadata (server-only).
 */
export async function updateVendorMetadata(organizationId: string, data: VendorMetadataInput) {
  return runWithCorrelationId(async () => {
    await rateLimit(30, 60 * 1000);
    const parsed = vendorMetadataSchema.safeParse({ organizationId, data });
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || "Invalid input.");
    }

    const { orgId, orgRole, userId } = await auth();

    if (!userId || !orgId || orgId !== parsed.data.organizationId) {
      throw new Error("Not authorized: You do not belong to this organization.");
    }
    await requireVendorRole(userId);

    if (parsed.data.data.bannerUrl) {
      if (!isAllowedCloudinaryDeliveryUrl(parsed.data.data.bannerUrl, orgId)) {
        throw new Error("Invalid banner image: The image must belong to your organization folder.");
      }
    }

    if (orgRole !== "org:admin" && orgRole !== "org:member") {
      throw new Error("Not authorized: You do not have permission to configure profile settings.");
    }

    const client = await clerkClient();
    const org = await client.organizations.getOrganization({
      organizationId: parsed.data.organizationId,
    });
    const existingPublic = stripBankFieldsFromPublic(
      (org.publicMetadata || {}) as Record<string, unknown>,
    );
    const existingPrivate = (org.privateMetadata || {}) as Record<string, unknown>;

    const publicProfileUpdates = buildPublicProfileMetadataFromVendorData(parsed.data.data);

    // Security check: Only admins can modify stock allocation mode
    if (orgRole !== "org:admin") {
      publicProfileUpdates.stockAllocationMode = existingPublic.stockAllocationMode as any;
    }

    const publicMetadata = {
      ...existingPublic,
      ...publicProfileUpdates,
    };

    // Security check: Only admins can modify bank transfer details
    let privateMetadata = existingPrivate;
    if (orgRole === "org:admin") {
      privateMetadata = {
        ...existingPrivate,
        ...buildBankPrivateMetadataFromVendorData(parsed.data.data),
      };
    }

    await client.organizations.updateOrganization(parsed.data.organizationId, {
      publicMetadata,
      privateMetadata,
    });

    if (userId) {
      await logAuditAction({
        userId,
        action: "UPDATE_VENDOR_METADATA",
        targetType: "vendor",
        targetId: parsed.data.organizationId,
        metadata: {
          description: parsed.data.data.description,
          address: parsed.data.data.address,
          phone: parsed.data.data.phone,
          bannerUrl: parsed.data.data.bannerUrl,
          stockAllocationMode: parsed.data.data.stockAllocationMode,
          bankTransferConfigured: hasBankTransferConfiguredForOrg({
            publicMetadata,
            privateMetadata,
          }),
        },
      });
    }

    revalidatePath("/");
    revalidateVendorConsole();
    revalidatePath("/vendors");

    try {
      const refreshedOrg = await client.organizations.getOrganization({
        organizationId: parsed.data.organizationId,
      });
      if (refreshedOrg.slug) {
        revalidatePath(`/vendors/${refreshedOrg.slug}`);
      }
    } catch (err) {
      logger.error("Error fetching org slug for path revalidation:", err);
    }

    return { success: true };
  });
}
