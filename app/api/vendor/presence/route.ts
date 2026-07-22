import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  setVendorOnlineStatus,
  peekVendorNotifications,
  ackVendorNotifications,
} from "@/shared/security/vendor-presence";
import {
  getCachedUserRole,
  getSuperadminOrganizations,
  getCachedUserBelongsToOrg,
} from "@/shared/auth/clerk-cache";
import { withErrorHandler } from "@/shared/api/api-handler";

export const POST = withErrorHandler(async (req: Request) => {
  const { userId, orgRole } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify if user is actually a vendor/admin
  let isVendor = orgRole === "org:admin" || orgRole === "org:member";

  if (!isVendor) {
    const [role, superOrgs, belongsToOrg] = await Promise.all([
      getCachedUserRole(userId),
      getSuperadminOrganizations(),
      getCachedUserBelongsToOrg(userId),
    ]);
    isVendor = role === "vendor" || superOrgs.length > 0 || belongsToOrg;
  }

  if (!isVendor) {
    return NextResponse.json({ success: true, notVendor: true });
  }

  const success = await setVendorOnlineStatus(userId);
  if (!success) {
    return NextResponse.json({ error: "Failed to update presence" }, { status: 500 });
  }

  // Optionally handle acknowledgments if the client passed them
  let reqBody: any = null;
  try {
    reqBody = await req.json();
  } catch {
    // Ignore empty body
  }

  if (reqBody && reqBody.ackIds && Array.isArray(reqBody.ackIds)) {
    await ackVendorNotifications(userId, reqBody.ackIds);
  }

  // Securely peek any pending notifications for this specific user
  const notifications = await peekVendorNotifications(userId);

  return NextResponse.json({ success: true, notifications });
});
