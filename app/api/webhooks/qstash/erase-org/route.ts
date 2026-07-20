import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/shared/db/client';
import * as schema from '@/shared/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { logger } from '@/shared/logging/logger';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { Redis } from '@upstash/redis';
import { logAuditAction } from '@/shared/audit/logger';

export const maxDuration = 300;

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

async function handler(req: NextRequest) {
  const messageId = req.headers.get('upstash-message-id');
  if (!messageId) {
    return NextResponse.json({ error: 'Missing upstash-message-id' }, { status: 400 });
  }

  try {
    const isDone = await redis.get(`erase_org:msg_id:${messageId}:done`);
    if (isDone) {
      logger.info(`Idempotency caught duplicate execution for QStash message ${messageId}`);
      return NextResponse.json({ success: true, message: 'Duplicate message ignored' }, { status: 200 });
    }

    const lock = await redis.set(`erase_org:msg_id:${messageId}:lock`, "1", { nx: true, ex: 120 });
    if (!lock) {
      logger.warn(`QStash message ${messageId} is currently being processed. Returning 409 to trigger retry.`);
      return NextResponse.json({ error: 'Currently processing' }, { status: 409 });
    }

    const body = await req.json();
    const { targetOrgId, adminUserId } = body;

    if (!targetOrgId || !adminUserId) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    let branchesDeleted = 0;
    let productsDeleted = 0;
    let suppliersDeleted = 0;
    let simulatedOrdersDeleted = 0;

    await db.transaction(async (tx) => {
      // Branches (cascades to branch_inventory, branch_members, billing_receipts)
      const branches = await tx.delete(schema.branches).where(eq(schema.branches.orgId, targetOrgId)).returning({ id: schema.branches.id });
      branchesDeleted = branches.length;

      // Products (cascades to reviews, wishlists, questions, inventory, service_configurations)
      const products = await tx.delete(schema.products).where(eq(schema.products.orgId, targetOrgId)).returning({ id: schema.products.id });
      productsDeleted = products.length;

      // Suppliers
      const suppliers = await tx.delete(schema.suppliers).where(eq(schema.suppliers.orgId, targetOrgId)).returning({ id: schema.suppliers.id });
      suppliersDeleted = suppliers.length;

      // Simulated Orders (vendorOrgId matches)
      const orders = await tx.delete(schema.simulatedOrders).where(eq(schema.simulatedOrders.vendorOrgId, targetOrgId)).returning({ id: schema.simulatedOrders.id });
      simulatedOrdersDeleted = orders.length;
    });

    await logAuditAction({
      userId: adminUserId,
      action: 'API_GDPR_ORG_ERASURE_BACKGROUND',
      targetType: 'vendor',
      targetId: targetOrgId,
      metadata: { branchesDeleted, productsDeleted, suppliersDeleted, simulatedOrdersDeleted },
      strict: true,
    });

    logger.info(`Organization background erasure completed successfully for ${targetOrgId}`);

    await redis.set(`erase_org:msg_id:${messageId}:done`, "1", { ex: 86400 });
    await redis.del(`erase_org:msg_id:${messageId}:lock`);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Organization Background Erasure Error', error);
    try {
      await redis.del(`erase_org:msg_id:${messageId}:lock`);
    } catch (e) {
      logger.error('Failed to release idempotency lock', e);
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const POST = async (req: NextRequest) => {
  return verifySignatureAppRouter(handler)(req);
};
