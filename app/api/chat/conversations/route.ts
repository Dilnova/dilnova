import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { listOrgConversations, listCustomerConversations } from "@/features/chat/queries";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { userId, orgId, orgRole } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || undefined;
  const branchId = searchParams.get("branchId") || undefined;

  try {
    if (orgId && (orgRole === "org:admin" || orgRole === "org:member")) {
      const result = await listOrgConversations(orgId, {
        userId,
        orgRole,
        status,
        branchId,
        limit: 50,
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch conversations" },
      { status: 500 },
    );
  }
}
