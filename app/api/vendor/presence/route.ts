import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { setVendorOnlineStatus, popVendorNotifications } from '@/shared/security/vendor-presence';
import { getCachedUserRole, getSuperadminOrganizations, getCachedUserBelongsToOrg } from '@/shared/auth/clerk-cache';

export async function POST() {
  try {
    const { userId, orgRole } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify if user is actually a vendor/admin
    let isVendor = orgRole === 'org:admin' || orgRole === 'org:member';
    
    if (!isVendor) {
      const [role, superOrgs, belongsToOrg] = await Promise.all([
        getCachedUserRole(userId),
        getSuperadminOrganizations(),
        getCachedUserBelongsToOrg(userId)
      ]);
      isVendor = role === 'vendor' || superOrgs.length > 0 || belongsToOrg;
    }

    if (!isVendor) {
      return NextResponse.json({ success: true, notVendor: true });
    }

    const success = await setVendorOnlineStatus(userId);
    if (!success) {
      return NextResponse.json({ error: 'Failed to update presence' }, { status: 500 });
    }

    // Securely pop any pending notifications for this specific user
    const notifications = await popVendorNotifications(userId);

    return NextResponse.json({ success: true, notifications });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
