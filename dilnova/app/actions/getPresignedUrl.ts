'use server';

import { auth } from '@clerk/nextjs/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { b2Client } from '@/utils/b2';

interface GeneratePresignedUrlResponse {
  success: boolean;
  uploadUrl?: string;
  publicUrl?: string;
  error?: string;
}

const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'video/mp4',
  'video/quicktime',
  'video/webm',
];

/**
 * Server action to generate S3 Presigned URLs for client-side direct uploads to Backblaze B2.
 * This keeps credentials secure on the server and prevents heavy files from choking the Next.js server.
 */
export async function getPresignedUrl(
  fileName: string,
  contentType: string
): Promise<GeneratePresignedUrlResponse> {
  try {
    // 1. Authenticate with Clerk
    const { userId, orgId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized: You must be logged in to upload files.' };
    }

    // 2. Validate Content-Type
    if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
      return { success: false, error: 'Invalid content type. Only standard images and videos are allowed.' };
    }

    const bucketName = process.env.B2_BUCKET_NAME;
    const region = process.env.B2_REGION || 'us-east-005';
    
    if (!bucketName) {
      return { success: false, error: 'Storage configuration error: B2_BUCKET_NAME is not configured on the server.' };
    }

    // 3. Generate a secure, unique key namespaced by the user's Organization ID or User ID
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const folder = orgId ? `org_${orgId}` : `user_${userId}`;
    const uniqueKey = `${folder}/${crypto.randomUUID()}-${sanitizedFileName}`;

    // 4. Create S3 PUT Command
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: uniqueKey,
      ContentType: contentType,
    });

    // 5. Generate Presigned URL (valid for 15 minutes / 900 seconds)
    const uploadUrl = await getSignedUrl(b2Client, command, { expiresIn: 900 });

    // 6. Build the public download URL
    // Standard Backblaze S3 compatible endpoint:
    // https://[bucketName].s3.[region].backblazeb2.com/[key]
    // Note: If you place Cloudflare in front of it, replace this with your Cloudflare CDN domain.
    const publicUrl = `https://${bucketName}.s3.${region}.backblazeb2.com/${uniqueKey}`;

    return {
      success: true,
      uploadUrl,
      publicUrl,
    };
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return {
      success: false,
      error: 'Internal server error while generating upload path.',
    };
  }
}
