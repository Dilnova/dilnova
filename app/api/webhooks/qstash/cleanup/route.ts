import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/shared/logging/logger";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { createSupabaseAdminClient } from "@/shared/storage/admin-client";
import { GDPR_EXPORTS_BUCKET } from "@/shared/storage/config";

export const maxDuration = 60;

async function handler(req: NextRequest) {
  try {
    const body = await req.json();
    const { storagePath } = body;

    if (!storagePath) {
      return NextResponse.json({ error: "Missing storagePath" }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.storage.from(GDPR_EXPORTS_BUCKET).remove([storagePath]);

    if (error) {
      throw new Error(`Failed to delete GDPR export: ${error.message}`);
    }

    logger.info(`Cleaned up GDPR export file: ${storagePath}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("GDPR Cleanup Worker Error", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export const POST = async (req: NextRequest) => {
  return verifySignatureAppRouter(handler)(req);
};
