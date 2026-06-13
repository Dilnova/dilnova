export function getCloudinaryCloudName(): string | null {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
  return cloudName || null;
}

/** Delivery URLs must come from this app's configured Cloudinary cloud. */
export function isAllowedCloudinaryDeliveryUrl(url: string): boolean {
  const cloudName = getCloudinaryCloudName();
  if (!cloudName) return false;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    if (parsed.hostname !== 'res.cloudinary.com') return false;

    const [pathCloudName] = parsed.pathname.split('/').filter(Boolean);
    return pathCloudName === cloudName;
  } catch {
    return false;
  }
}
