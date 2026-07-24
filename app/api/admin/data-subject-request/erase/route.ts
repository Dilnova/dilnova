import { NextRequest, NextResponse } from "next/server";
import { checkSuperAdmin } from "@/shared/auth/superadmin-guard";
import { rateLimit } from "@/shared/security/rate-limit";
import { logger } from "@/shared/logging/logger";
import { getQStashClient } from "@/shared/security/qstash-client";

export async function DELETE(req: NextRequest) {
  try {
    const adminUser = await checkSuperAdmin();
    await rateLimit(5, 60 * 1000, adminUser.id, { failClosed: true });
    const targetUserId = req.nextUrl.searchParams.get("userId");

    if (!targetUserId) {
      return NextResponse.json({ error: "Missing userId parameter" }, { status: 400 });
    }

    const appUrl =
      process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const qstash = getQStashClient();
    // Publish background job to QStash
    await qstash.publishJSON({
      url: `${appUrl}/api/webhooks/qstash/erase`,
      body: {
        targetUserId,
        adminUserId: adminUser.id,
      },
    });

    logger.info(`Queued GDPR background erasure for ${targetUserId} by admin ${adminUser.id}`);

    // Return 202 Accepted to prevent UI from hanging and function from timing out
    return NextResponse.json(
      { success: true, message: "Erasure queued for background processing" },
      { status: 202 },
    );
  } catch (error) {
    logger.error("GDPR Erasure Queueing Error", error);
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
