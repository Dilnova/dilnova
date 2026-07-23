import { NextRequest, NextResponse } from "next/server";
import { checkSuperAdmin } from "@/shared/auth/superadmin-guard";
import { rateLimit } from "@/shared/security/rate-limit";
import { logAuditAction } from "@/shared/audit/logger";
import { clerkClient } from "@clerk/nextjs/server";
import { logger } from "@/shared/logging/logger";
import { getQStashClient } from "@/shared/security/qstash-client";

export async function GET(req: NextRequest) {
  try {
    const adminUser = await checkSuperAdmin();
    await rateLimit(5, 60 * 1000, adminUser.id, { failClosed: true });
    const targetUserId = req.nextUrl.searchParams.get("userId");

    if (!targetUserId) {
      return NextResponse.json({ error: "Missing userId parameter" }, { status: 400 });
    }

    const client = await clerkClient();
    const clerkAdminUser = await client.users.getUser(adminUser.id);
    const adminEmail = clerkAdminUser.emailAddresses[0]?.emailAddress;

    if (!adminEmail) {
      return NextResponse.json(
        { error: "Superadmin account lacks an email address." },
        { status: 400 },
      );
    }

    const appUrl =
      process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const qstash = getQStashClient();
    // Publish to QStash for asynchronous processing
    const message = await qstash.publishJSON({
      url: `${appUrl}/api/webhooks/qstash/export`,
      body: {
        targetUserId,
        adminUserId: adminUser.id,
        adminEmail,
      },
    });

    await logAuditAction({
      userId: adminUser.id,
      action: "API_GDPR_EXPORT_QUEUED",
      targetType: "data_subject_request",
      targetId: targetUserId,
      metadata: { qstashMessageId: message.messageId },
      strict: true,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Export job queued successfully. You will receive an email when it is ready.",
      },
      { status: 202 },
    );
  } catch (error) {
    logger.error("GDPR Export Queue Error", error);
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
