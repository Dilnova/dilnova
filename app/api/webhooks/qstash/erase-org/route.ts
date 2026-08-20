import { NextRequest, NextResponse } from "next/server";
import { db } from "@/shared/db/client";
import * as schema from "@/shared/db/schema";
import { eq, inArray, and, ne } from "drizzle-orm";
import { logger } from "@/shared/logging/logger";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { Redis } from "@upstash/redis";
import { logAuditAction } from "@/shared/audit/logger";
import { z } from "zod/v3";

export const maxDuration = 300;

const eraseOrgPayloadSchema = z.object({
  targetOrgId: z.string().min(1).max(128),
  adminUserId: z.string().min(1).max(128),
});

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

async function handler(req: NextRequest) {
  const messageId = req.headers.get("upstash-message-id");
  if (!messageId) {
    return NextResponse.json({ error: "Missing upstash-message-id" }, { status: 400 });
  }

  try {
    const isDone = await redis.get(`erase_org:msg_id:${messageId}:done`);
    if (isDone) {
      logger.info(`Idempotency caught duplicate execution for QStash message ${messageId}`);
      return NextResponse.json(
        { success: true, message: "Duplicate message ignored" },
        { status: 200 },
      );
    }

    const lock = await redis.set(`erase_org:msg_id:${messageId}:lock`, "1", { nx: true, ex: 120 });
    if (!lock) {
      logger.warn(
        `QStash message ${messageId} is currently being processed. Returning 409 to trigger retry.`,
      );
      return NextResponse.json({ error: "Currently processing" }, { status: 409 });
    }

    const body = await req.json();
    const parsed = eraseOrgPayloadSchema.safeParse(body);

    if (!parsed.success) {
      logger.warn("GDPR org erasure webhook received invalid payload", {
        error: parsed.error.issues[0]?.message,
      });
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const { targetOrgId, adminUserId } = parsed.data;

    let branchesDeleted = 0;
    let productsDeleted = 0;
    let suppliersDeleted = 0;
    // Order deletion is split into two categories to protect other orgs' data:
    //   exclusiveOrdersDeleted  — orders that belonged ONLY to this org (fully deleted)
    //   sharedOrderItemsCleaned — orders shared with other vendors (only this org's items removed)
    let exclusiveOrdersDeleted = 0;
    let sharedOrderItemsCleaned = 0;
    let orgSettingsDeleted = 0;
    let shippingRulesDeleted = 0;
    let taxClassesDeleted = 0;

    await db.transaction(async (tx) => {
      // ── 1. Branches
      // ON DELETE CASCADE handles: branch_inventory, branch_members,
      //   billing_receipts → billing_receipt_items
      const branches = await tx
        .delete(schema.branches)
        .where(eq(schema.branches.orgId, targetOrgId))
        .returning({ id: schema.branches.id });
      branchesDeleted = branches.length;

      // ── 2. Products
      // ON DELETE CASCADE handles: reviews, wishlists, questions,
      //   inventory → inventory_movements, service_configurations,
      //   product_waitlists, branch_inventory, simulated_order_items,
      //   billing_receipt_items
      const products = await tx
        .delete(schema.products)
        .where(eq(schema.products.orgId, targetOrgId))
        .returning({ id: schema.products.id });
      productsDeleted = products.length;

      // ── 3. Suppliers
      const suppliers = await tx
        .delete(schema.suppliers)
        .where(eq(schema.suppliers.orgId, targetOrgId))
        .returning({ id: schema.suppliers.id });
      suppliersDeleted = suppliers.length;

      // ── 4. Orders — split exclusive vs. shared (multi-vendor) orders
      //
      // BUG FIX: The previous implementation deleted the entire simulatedOrder whenever
      // any of its items belonged to the deleted org. In multi-vendor orders this
      // destroyed line items, shipments, and returns belonging to OTHER live orgs.
      //
      // Correct behaviour:
      //   • Exclusive orders  (ALL items from this org) → delete entire order record
      //     (Postgres cascade removes items, shipments, returns automatically)
      //   • Shared orders (items from this org AND other orgs) → remove ONLY this org's
      //     items and shipments; preserve the order record and other orgs' data
      const orgItems = await tx
        .select({ orderId: schema.simulatedOrderItems.orderId })
        .from(schema.simulatedOrderItems)
        .where(eq(schema.simulatedOrderItems.vendorOrgId, targetOrgId));

      const orgOrderIds = [...new Set(orgItems.map((i) => i.orderId))];

      if (orgOrderIds.length > 0) {
        // Identify orders that also carry items from at least one other vendor
        const otherVendorItems = await tx
          .select({ orderId: schema.simulatedOrderItems.orderId })
          .from(schema.simulatedOrderItems)
          .where(
            and(
              inArray(schema.simulatedOrderItems.orderId, orgOrderIds),
              ne(schema.simulatedOrderItems.vendorOrgId, targetOrgId),
            ),
          );
        const sharedOrderIdSet = new Set(otherVendorItems.map((i) => i.orderId));

        const exclusiveOrderIds = orgOrderIds.filter((id) => !sharedOrderIdSet.has(id));
        const sharedOrderIds = [...sharedOrderIdSet];

        // 4a. Exclusive orders — delete the whole order row; cascade does the rest
        if (exclusiveOrderIds.length > 0) {
          const deleted = await tx
            .delete(schema.simulatedOrders)
            .where(inArray(schema.simulatedOrders.id, exclusiveOrderIds))
            .returning({ id: schema.simulatedOrders.id });
          exclusiveOrdersDeleted = deleted.length;
        }

        // 4b. Shared orders — surgical removal: only this org's items + shipments
        if (sharedOrderIds.length > 0) {
          // Remove this org's line items from shared orders
          await tx
            .delete(schema.simulatedOrderItems)
            .where(
              and(
                inArray(schema.simulatedOrderItems.orderId, sharedOrderIds),
                eq(schema.simulatedOrderItems.vendorOrgId, targetOrgId),
              ),
            );

          // Remove this org's shipment records from shared orders
          await tx
            .delete(schema.shipments)
            .where(
              and(
                inArray(schema.shipments.orderId, sharedOrderIds),
                eq(schema.shipments.vendorOrgId, targetOrgId),
              ),
            );

          sharedOrderItemsCleaned = sharedOrderIds.length;
          logger.info(
            `Org ${targetOrgId}: preserved ${sharedOrderIds.length} shared order(s) for other vendors`,
          );
        }
      }

      // ── 5. Org settings (FIX: was never deleted — Gap 2)
      const orgSettingsResult = await tx
        .delete(schema.orgSettings)
        .where(eq(schema.orgSettings.orgId, targetOrgId))
        .returning({ orgId: schema.orgSettings.orgId });
      orgSettingsDeleted = orgSettingsResult.length;

      // ── 6. Org shipping rules (FIX: was never deleted — Gap 3)
      const shippingResult = await tx
        .delete(schema.orgShippingRules)
        .where(eq(schema.orgShippingRules.orgId, targetOrgId))
        .returning({ id: schema.orgShippingRules.id });
      shippingRulesDeleted = shippingResult.length;

      // ── 7. Org-scoped tax classes (FIX: was never deleted — Gap 4)
      // Only removes tax classes explicitly owned by this org.
      // Global platform tax classes have orgId = null and are intentionally preserved.
      // org_settings.defaultTaxClassId FK has onDelete: "set null" — safe to delete tax
      // classes after org_settings has already been removed in step 5.
      const taxResult = await tx
        .delete(schema.taxClasses)
        .where(eq(schema.taxClasses.orgId, targetOrgId))
        .returning({ id: schema.taxClasses.id });
      taxClassesDeleted = taxResult.length;
    });

    await logAuditAction({
      userId: adminUserId,
      action: "API_GDPR_ORG_ERASURE_BACKGROUND",
      targetType: "vendor",
      targetId: targetOrgId,
      metadata: {
        branchesDeleted,
        productsDeleted,
        suppliersDeleted,
        exclusiveOrdersDeleted,
        sharedOrderItemsCleaned,
        orgSettingsDeleted,
        shippingRulesDeleted,
        taxClassesDeleted,
      },
      strict: true,
    });

    logger.info(`Organization background erasure completed successfully for ${targetOrgId}`);

    await redis.set(`erase_org:msg_id:${messageId}:done`, "1", { ex: 86400 });
    await redis.del(`erase_org:msg_id:${messageId}:lock`);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Organization Background Erasure Error", error);
    try {
      await redis.del(`erase_org:msg_id:${messageId}:lock`);
    } catch (e) {
      logger.error("Failed to release idempotency lock", e);
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export const POST = async (req: NextRequest) => {
  return verifySignatureAppRouter(handler)(req);
};
