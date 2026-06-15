'use server';

import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { checkSuperAdmin } from '@/shared/auth/superadmin-guard';
import {
  createCloudinaryUploadSignature,
  type CloudinaryResourceType,
} from '@/shared/media/cloudinary-server';
import { rateLimit } from '@/shared/security/rate-limit';
import { runWithCorrelationId } from '@/shared/security/async-context';

const cloudinaryUploadSignatureSchema = z.object({
  uploadKind: z.enum(['catalog', 'vendor-profile', 'platform']),
  resourceType: z.enum(['image', 'video']),
});

export type CloudinaryUploadKind = z.infer<typeof cloudinaryUploadSignatureSchema>['uploadKind'];

function resolveUploadFolder(uploadKind: CloudinaryUploadKind, orgId: string | null): string {
  if (uploadKind === 'platform') {
    return 'dilnova/platform';
  }

  if (!orgId) {
    throw new Error('Organization context is required for vendor uploads.');
  }

  if (uploadKind === 'vendor-profile') {
    return `dilnova/vendors/${orgId}/profile`;
  }

  return `dilnova/vendors/${orgId}/catalog`;
}

export async function createCloudinaryUploadSignatureAction(input: {
  uploadKind: CloudinaryUploadKind;
  resourceType: CloudinaryResourceType;
}) {
  return runWithCorrelationId(async () => {
    try {
      await rateLimit(30, 60 * 1000);

      const parsed = cloudinaryUploadSignatureSchema.safeParse(input);
      if (!parsed.success) {
        return {
          success: false as const,
          error: parsed.error.issues[0]?.message || 'Invalid upload request.',
        };
      }

      const { userId, orgId, orgRole } = await auth();
      if (!userId) {
        return { success: false as const, error: 'Please sign in to upload media.' };
      }

      if (parsed.data.uploadKind === 'platform') {
        await checkSuperAdmin();
      } else {
        if (!orgId) {
          return {
            success: false as const,
            error: 'Switch to a vendor organization before uploading media.',
          };
        }

        if (parsed.data.uploadKind === 'vendor-profile' && orgRole !== 'org:admin') {
          return {
            success: false as const,
            error: 'Only organization admins can update vendor profile media.',
          };
        }

        if (orgRole !== 'org:admin' && orgRole !== 'org:member') {
          return {
            success: false as const,
            error: 'You are not authorized to upload media for this organization.',
          };
        }
      }

      const folder = resolveUploadFolder(parsed.data.uploadKind, orgId ?? null);
      const signature = createCloudinaryUploadSignature({
        folder,
        resourceType: parsed.data.resourceType,
      });

      return { success: true as const, data: signature };
    } catch (error) {
      return {
        success: false as const,
        error: error instanceof Error ? error.message : 'Failed to prepare media upload.',
      };
    }
  });
}
