import 'server-only';

import {
  signCloudinaryUploadParams,
  type CloudinaryResourceType,
} from '@/shared/media/cloudinary-signing';

export type { CloudinaryResourceType };

export interface CloudinaryUploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  resourceType: CloudinaryResourceType;
}

function readCloudinaryServerEnv(): {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
} {
  const cloudName =
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim() ||
    process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      'Cloudinary signed uploads are not configured. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.'
    );
  }

  return { cloudName, apiKey, apiSecret };
}

export function createCloudinaryUploadSignature(input: {
  folder: string;
  resourceType: CloudinaryResourceType;
}): CloudinaryUploadSignature {
  const { cloudName, apiKey, apiSecret } = readCloudinaryServerEnv();
  const folder = input.folder.replace(/^\/+|\/+$/g, '');
  if (!folder || folder.includes('..')) {
    throw new Error('Invalid Cloudinary upload folder.');
  }

  const timestamp = Math.round(Date.now() / 1000);
  const signature = signCloudinaryUploadParams({ folder, timestamp }, apiSecret);

  return {
    cloudName,
    apiKey,
    timestamp,
    signature,
    folder,
    resourceType: input.resourceType,
  };
}

export async function deleteCloudinaryAsset(imageUrl: string, resourceType: CloudinaryResourceType = 'image'): Promise<void> {
  if (!imageUrl) return;

  try {
    const parsedUrl = new URL(imageUrl);
    if (parsedUrl.hostname !== 'res.cloudinary.com') return;
  } catch {
    return;
  }

  const { cloudName, apiKey, apiSecret } = readCloudinaryServerEnv();
  
  // Extract public_id from URL: https://res.cloudinary.com/cloudname/image/upload/v1234/folder/file.jpg -> folder/file
  const match = imageUrl.match(/\/upload\/(?:v\d+\/)?([^.]+)/);
  if (!match) return;
  
  const public_id = match[1];
  const timestamp = Math.round(Date.now() / 1000);
  
  const signature = signCloudinaryUploadParams({ public_id, timestamp }, apiSecret);
  
  const formData = new FormData();
  formData.append('public_id', public_id);
  formData.append('timestamp', timestamp.toString());
  formData.append('api_key', apiKey);
  formData.append('signature', signature);
  
  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      console.error(`Failed to delete Cloudinary asset ${public_id}:`, await res.text());
    }
  } catch (err) {
    console.error(`Error deleting Cloudinary asset ${public_id}:`, err);
  }
}
