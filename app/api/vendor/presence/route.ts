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
import { withErrorHandler, apiSuccess, apiError } from "@/shared/api/api-handler";

export const POST = withErrorHandler(async (req: Request) => {
  const { userId, orgRole } = await auth();
  if (!userId) {
    return apiError("Unauthorized", { status: 401 });
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
    return apiSuccess({ notVendor: true });
  }

  const success = await setVendorOnlineStatus(userId);
  if (!success) {
    return apiError("Failed to update presence", { status: 500 });
  }

  // Optionally handle acknowledgments if the client passed them
  let reqBody: { ackIds?: string[] } | null = null;
  try {
    reqBody = await req.json();
  } catch {
    // Ignore empty body
  }

  if (reqBody?.ackIds && Array.isArray(reqBody.ackIds) && reqBody.ackIds.length > 0) {
    const safeAckIds = reqBody.ackIds
      .filter((id: unknown): id is string => typeof id === "string")
      .slice(0, 50);
    if (safeAckIds.length > 0) {
      await ackVendorNotifications(userId, safeAckIds);
    }
  }

  // Securely peek any pending notifications for this specific user
  const notifications = await peekVendorNotifications(userId);

  return apiSuccess({ notifications });
});
