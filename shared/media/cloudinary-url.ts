export function getCloudinaryCloudName(): string | null {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
  return cloudName || null;
}

/** Delivery URLs must come from this app's configured Cloudinary cloud and match the vendor's folder. */
export function isAllowedCloudinaryDeliveryUrl(url: string, orgId?: string | null): boolean {
  const cloudName = getCloudinaryCloudName();
  if (!cloudName) return false;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    if (parsed.hostname !== 'res.cloudinary.com') return false;

    const parts = parsed.pathname.split('/').filter(Boolean);
    const pathCloudName = parts[0];
    if (pathCloudName !== cloudName) return false;

    const dilnovaIndex = parts.indexOf('dilnova');
    if (dilnovaIndex !== -1 && parts[dilnovaIndex + 1] === 'vendors') {
      const urlOrgId = parts[dilnovaIndex + 2];
      if (!orgId || urlOrgId !== orgId) {
        return false;
      }
    } else if (orgId) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
