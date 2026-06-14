'use server';

import { db } from '@/shared/db/client';
import * as schema from '@/shared/db/schema';
import { eq, and } from 'drizzle-orm';
import { revalidateVendorConsole } from '@/features/vendor/revalidate';
import { processBillingCheckoutSchema } from '@/features/billing/schema';
import {
  getStockAvailabilityCatalog,
  resolveEffectiveStockAvailability,
} from '@/features/inventory/availability.server';
import { reserveProductStock, applyStockReservation } from '@/features/inventory/reservation';
import { verifyVendorAccess } from '@/features/inventory/vendor-data';
import { logAuditAction } from '@/shared/audit/logger';
import { runWithCorrelationId } from '@/shared/security/async-context';
import { rateLimit } from '@/shared/security/rate-limit';

// ── POS BILLING CHECKOUT (Premium POS Register) ──────────────

export async function processBillingCheckoutAction(data: {
  branchId: string;
  items: { productId: string; productName: string; quantity: number; unitPrice: number }[];
  paymentMethod: 'cash' | 'card' | 'other';
  customerName?: string;
  notes?: string;
}) {
  return runWithCorrelationId(async () => {
    await rateLimit(30, 60 * 1000);
    // Any org member can process checkout if billing register is active, no checkRole requirement.
    const { userId, orgId, orgRole, premiumStatus } = await verifyVendorAccess({ allowMember: true });
    if (!premiumStatus.billingActive) {
      throw new Error('POS Billing Register feature is not unlocked on your account tier.');
    }

    const parsed = processBillingCheckoutSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || 'Invalid input.');
    }

    // Verify branch belongs to org
    const [branch] = await db
      .select({ id: schema.branches.id, name: schema.branches.name })
      .from(schema.branches)
      .where(and(eq(schema.branches.id, parsed.data.branchId), eq(schema.branches.orgId, orgId)))
      .limit(1);

    if (!branch) {
      throw new Error('Branch not found or access denied.');
    }

    // Verify cashier assignment to the branch when multi-branch is active and the cashier is not a global admin
    if (premiumStatus.multiBranchActive && orgRole !== 'org:admin') {
      const [membership] = await db
        .select()
        .from(schema.branchMembers)
        .where(
          and(
            eq(schema.branchMembers.branchId, parsed.data.branchId),
            eq(schema.branchMembers.memberUserId, userId)
          )
        )
        .limit(1);

      if (!membership) {
        throw new Error('Not authorized: You are not assigned to this branch register.');
      }
    }

    const aggregatedItems = new Map<
      string,
      { productId: string; productName: string; quantity: number; unitPrice: number }
    >();
    for (const item of parsed.data.items) {
      const existing = aggregatedItems.get(item.productId);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        aggregatedItems.set(item.productId, { ...item });
      }
    }
    const checkoutItems = [...aggregatedItems.values()];

    return await db.transaction(async (tx) => {
      let totalAmount = 0;
      const availabilityCatalog = await getStockAvailabilityCatalog();

      // 1. Create Receipt
      const [receipt] = await tx
        .insert(schema.billingReceipts)
        .values({
          branchId: parsed.data.branchId,
          orgId,
          cashierUserId: userId,
          totalAmount: 0, // update later
          paymentMethod: parsed.data.paymentMethod,
          customerName: parsed.data.customerName || null,
          notes: parsed.data.notes || null,
        })
        .returning();

      for (const item of checkoutItems) {
        const [prod] = await tx
          .select({
            id: schema.products.id,
            name: schema.products.name,
            price: schema.products.price,
            type: schema.products.type,
            status: schema.products.status,
          })
          .from(schema.products)
          .where(and(eq(schema.products.id, item.productId), eq(schema.products.orgId, orgId)))
          .limit(1);

        if (!prod) {
          throw new Error(`Product not found or access denied: ${item.productName}`);
        }
        if (prod.status !== 'active') {
          throw new Error(`"${prod.name}" is not active and cannot be sold.`);
        }
        if (prod.price !== item.unitPrice) {
          throw new Error(`Price mismatch for "${prod.name}". Catalog price: ${prod.price}, Received: ${item.unitPrice}`);
        }

        totalAmount += prod.price * item.quantity;

        if (prod.type === 'product') {
          const [invMeta] = await tx
            .select({
              stockAvailability: schema.inventory.stockAvailability,
              quantity: schema.inventory.quantity,
            })
            .from(schema.inventory)
            .where(eq(schema.inventory.productId, item.productId))
            .limit(1);

          if (!invMeta) {
            throw new Error(`"${prod.name}" has no inventory record and cannot be sold.`);
          }

          const availability = resolveEffectiveStockAvailability(
            availabilityCatalog,
            invMeta.stockAvailability,
            invMeta.quantity
          );
          if (availability && !availability.allowsPurchase) {
            throw new Error(`"${prod.name}" is marked as ${availability.label} and cannot be sold.`);
          }

          const stockResult = await reserveProductStock(tx, item.productId, item.quantity, {
            branchId: premiumStatus.multiBranchActive ? parsed.data.branchId : null,
            productName: prod.name,
          });

          if (!stockResult.ok) {
            const branchHint = premiumStatus.multiBranchActive ? ` at branch "${branch.name}"` : '';
            throw new Error(`${stockResult.error.replace(/\.$/, '')}${branchHint}.`);
          }

          await applyStockReservation(tx, item.quantity, stockResult.reservation, {
            userId,
            reason: `POS receipt ${receipt.id} (${branch.name})`,
          });
        }

        await tx.insert(schema.billingReceiptItems).values({
          receiptId: receipt.id,
          productId: item.productId,
          productName: prod.name,
          quantity: item.quantity,
          unitPrice: prod.price,
        });
      }

      // Update total on receipt
      await tx
        .update(schema.billingReceipts)
        .set({ totalAmount })
        .where(eq(schema.billingReceipts.id, receipt.id));

      await logAuditAction({
        userId,
        action: 'POS_CHECKOUT',
        targetType: 'billing_receipt',
        targetId: receipt.id,
        metadata: { branchId: parsed.data.branchId, totalAmount, paymentMethod: parsed.data.paymentMethod },
      });

      revalidateVendorConsole();
      return { success: true, receiptId: receipt.id, totalAmount };
    });
  });
}
