import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { listOrgConversations, listCustomerConversations } from "@/features/chat/queries";
import { logger } from "@/shared/logging/logger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { userId, orgId, orgRole } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || undefined;
  const branchId = searchParams.get("branchId") || undefined;
  const rawLimit = searchParams.get("limit");
  const rawOffset = searchParams.get("offset");
  const limit = Math.min(Math.max(1, rawLimit ? parseInt(rawLimit, 10) || 50 : 50), 100);
  const offset = Math.max(0, rawOffset ? parseInt(rawOffset, 10) || 0 : 0);

  try {
    if (orgId && (orgRole === "org:admin" || orgRole === "org:member")) {
      const result = await listOrgConversations(orgId, {
        userId,
        orgRole,
        status,
        branchId,
        limit,
        offset,
      });

      return NextResponse.json({
        conversations: result.conversations,
        totalCount: result.totalCount,
      });
    }

    // Customer mode
    const conversations = await listCustomerConversations(userId);
    return NextResponse.json({
      conversations,
      totalCount: conversations.length,
    });
  } catch (error) {
    logger.error("[GET /api/chat/conversations] Error", error);
    return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 });
  }
}
