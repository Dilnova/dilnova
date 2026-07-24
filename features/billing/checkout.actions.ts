"use server";

import * as schema from "@/shared/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidateVendorConsole } from "@/features/vendor/revalidate";
import { processBillingCheckoutSchema } from "@/features/billing/schema";
import {
  getStockAvailabilityCatalog,
  resolveEffectiveStockAvailability,
} from "@/features/inventory/availability.server";
import { reserveProductStock, applyStockReservation } from "@/features/inventory/reservation";
import { getPremiumStatus } from "@/features/inventory/premium-license";
import { logAuditAction } from "@/shared/audit/logger";
import { runWithCorrelationId } from "@/shared/security/async-context";
import { rateLimit } from "@/shared/security/rate-limit";
import { vendorAction, ActionError } from "@/lib/safe-action";

// ── POS BILLING CHECKOUT (Premium POS Register) ──────────────

export const processBillingCheckoutAction = vendorAction
  .schema(processBillingCheckoutSchema)
  .action(async ({ parsedInput, ctx }) => {
    return runWithCorrelationId(async () => {
      const { userId, orgId, orgRole } = ctx;
      await rateLimit(30, 60 * 1000, userId, { failClosed: true });
      if (!orgId) {
        throw new ActionError("Not authorized: You must be signed in with an active organization.");
      }

      const premiumStatus = await getPremiumStatus(orgId);
      if (!premiumStatus.billingActive) {
        throw new ActionError("POS Billing Register feature is not unlocked on your account tier.");
      }

      // vendorAction guarantees the user is org:member or org:admin (or superadmin).
      // Additional member-level access check already handled by vendorAction.

      // Verify branch belongs to org
      const [branch] = await ctx.db
        .select({ id: schema.branches.id, name: schema.branches.name })
        .from(schema.branches)
        .where(and(eq(schema.branches.id, parsedInput.branchId), eq(schema.branches.orgId, orgId)))
        .limit(1);

      if (!branch) {
        throw new ActionError("Branch not found or access denied.");
      }

      // Verify cashier assignment to the branch when multi-branch is active and the cashier is not a global admin
      if (premiumStatus.multiBranchActive && orgRole !== "org:admin") {
        const [membership] = await ctx.db
          .select()
          .from(schema.branchMembers)
          .where(
            and(
              eq(schema.branchMembers.branchId, parsedInput.branchId),
              eq(schema.branchMembers.memberUserId, userId),
            ),
          )
          .limit(1);

        if (!membership) {
          throw new ActionError("Not authorized: You are not assigned to this branch register.");
        }
      }

      const aggregatedItems = new Map<
        string,
        { productId: string; productName: string; quantity: number; unitPrice: number }
      >();
      for (const item of parsedInput.items) {
        const existing = aggregatedItems.get(item.productId);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          aggregatedItems.set(item.productId, { ...item });
        }
      }
      // Sort items by product ID to prevent deadlock during concurrent lock acquisition
      const checkoutItems = [...aggregatedItems.values()].sort((a, b) =>
        a.productId.localeCompare(b.productId),
      );

      return await ctx.db.transaction(async (tx) => {
        let totalAmount = 0;
        const availabilityCatalog = await getStockAvailabilityCatalog();

        // 1. Create Receipt
        const [receipt] = await tx
          .insert(schema.billingReceipts)
          .values({
            branchId: parsedInput.branchId,
            orgId,
            cashierUserId: userId,
            totalAmount: 0, // update later
            paymentMethod: parsedInput.paymentMethod,
            customerName: parsedInput.customerName || null,
            notes: parsedInput.notes || null,
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
            throw new ActionError(`Product not found or access denied: ${item.productName}`);
          }
          if (prod.status !== "active") {
            throw new ActionError(`"${prod.name}" is not active and cannot be sold.`);
          }
          if (prod.price !== item.unitPrice) {
            throw new ActionError(
              `Price mismatch for "${prod.name}". Catalog price: ${prod.price}, Received: ${item.unitPrice}`,
            );
          }

          totalAmount += prod.price * item.quantity;

          if (prod.type === "product") {
            const [invMeta] = await tx
              .select({
                stockAvailability: schema.inventory.stockAvailability,
                quantity: schema.inventory.quantity,
              })
              .from(schema.inventory)
              .where(eq(schema.inventory.productId, item.productId))
              .limit(1);

            if (!invMeta) {
              throw new ActionError(`"${prod.name}" has no inventory record and cannot be sold.`);
            }

            const availability = resolveEffectiveStockAvailability(
              availabilityCatalog,
              invMeta.stockAvailability,
              invMeta.quantity,
            );
            if (availability && !availability.allowsPurchase) {
              throw new ActionError(
                `"${prod.name}" is marked as ${availability.label} and cannot be sold.`,
              );
            }

            const stockResult = await reserveProductStock(tx, item.productId, item.quantity, {
              branchId: premiumStatus.multiBranchActive ? parsedInput.branchId : null,
              productName: prod.name,
            });

            if (!stockResult.ok) {
              const branchHint = premiumStatus.multiBranchActive
                ? ` at branch "${branch.name}"`
                : "";
              throw new ActionError(`${stockResult.error.replace(/\.$/, "")}${branchHint}.`);
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
          action: "POS_CHECKOUT",
          targetType: "billing_receipt",
          targetId: receipt.id,
          metadata: {
            branchId: parsedInput.branchId,
            totalAmount,
            paymentMethod: parsedInput.paymentMethod,
          },
        });

        revalidateVendorConsole();
        return { success: true as const, receiptId: receipt.id, totalAmount };
      });
    });
  });
