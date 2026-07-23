"use server";

import { z } from "zod/v3";
import { checkSuperAdmin } from "@/shared/auth/superadmin-guard";
import { createCloudinaryUploadSignature } from "@/shared/media/cloudinary-server";
import { rateLimit } from "@/shared/security/rate-limit";
import { runWithCorrelationId } from "@/shared/security/async-context";
import { authenticatedAction, ActionError } from "@/lib/safe-action";

const cloudinaryUploadSignatureSchema = z.object({
  uploadKind: z.enum(["catalog", "vendor-profile", "platform"]),
  resourceType: z.enum(["image", "video"]),
});

export type CloudinaryUploadKind = z.infer<typeof cloudinaryUploadSignatureSchema>["uploadKind"];

function resolveUploadFolder(uploadKind: CloudinaryUploadKind, orgId: string | null): string {
  if (uploadKind === "platform") {
    return "dilnova/platform";
  }

  if (!orgId) {
    throw new Error("Organization context is required for vendor uploads.");
  }

  if (uploadKind === "vendor-profile") {
    return `dilnova/vendors/${orgId}/profile`;
  }

  return `dilnova/vendors/${orgId}/catalog`;
}

export const createCloudinaryUploadSignatureAction = authenticatedAction
  .schema(cloudinaryUploadSignatureSchema)
  .action(async ({ parsedInput, ctx }) => {
    return runWithCorrelationId(async () => {
      try {
        await rateLimit(30, 60 * 1000);

        const { orgId, orgRole } = ctx;

        if (parsedInput.uploadKind === "platform") {
          await checkSuperAdmin();
        } else {
          if (!orgId) {
            throw new ActionError("Switch to a vendor organization before uploading media.");
          }

          if (parsedInput.uploadKind === "vendor-profile" && orgRole !== "org:admin") {
            throw new ActionError("Only organization admins can update vendor profile media.");
          }

          if (orgRole !== "org:admin" && orgRole !== "org:member") {
            throw new ActionError("You are not authorized to upload media for this organization.");
          }
        }

        const folder = resolveUploadFolder(parsedInput.uploadKind, orgId ?? null);
        const signature = createCloudinaryUploadSignature({
          folder,
          resourceType: parsedInput.resourceType,
        });

        return signature;
      } catch (error) {
        if (error instanceof ActionError) throw error;
        throw new ActionError(
          error instanceof Error ? error.message : "Failed to prepare media upload.",
        );
      }
    });
  });
