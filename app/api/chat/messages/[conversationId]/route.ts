import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/shared/db/client";
import * as schema from "@/shared/db/schema";
import { eq, and } from "drizzle-orm";
import { listMessages } from "@/features/chat/queries";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  const { conversationId } = await params;
  const { userId, orgId, orgRole } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify access to this conversation
  const convRows = await db
    .select()
    .from(schema.orderConversations)
    .where(eq(schema.orderConversations.id, conversationId))
    .limit(1);

  if (convRows.length === 0) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const conversation = convRows[0];
  const isCustomer = conversation.customerUserId === userId;
  const isVendor = orgId && conversation.orgId === orgId;

  if (!isCustomer && !isVendor) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // If accessing as vendor member (and not as the customer who owns the order), enforce branch scope
  if (!isCustomer && isVendor && orgRole === "org:member" && conversation.branchId) {
    const membership = await db
      .select({ id: schema.branchMembers.id })
      .from(schema.branchMembers)
      .where(
        and(
          eq(schema.branchMembers.branchId, conversation.branchId),
          eq(schema.branchMembers.memberUserId, userId),
        ),
      )
      .limit(1);

    if (membership.length === 0) {
      return NextResponse.json({ error: "Forbidden: Not in assigned branch" }, { status: 403 });
    }
  }

  const messages = await listMessages(conversationId, { limit: 100 });

  return NextResponse.json({
    conversation,
    messages,
  });
}
