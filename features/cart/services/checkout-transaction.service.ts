import { db } from '@/shared/db/client';
import * as schema from '@/shared/db/schema';
import { inArray } from 'drizzle-orm';
import { resolveEffectiveStockAvailability } from '@/features/inventory/availability.server';
import { reserveProductStock, applyStockReservation, type StockReservation } from '@/features/inventory/reservation';
import { applyOnlineOrderItemStock } from '@/features/orders/stock';
import { hashPii } from '@/shared/security/encryption';
import { logger } from '@/shared/logging/logger';
import { clerkClient } from '@clerk/nextjs/server';
import type { StockAvailabilityDefinition } from '@/features/inventory/availability.shared';
import type { CheckoutOptionDefinition } from '@/features/organization/checkout-options.shared';
import type { VerifiedCheckoutItem, DbTransaction } from './checkout.types';

export async function executeCheckoutTransaction(opts: {
  verifiedItems: VerifiedCheckoutItem[];
  availabilityCatalog: StockAvailabilityDefinition[];
  pickupBranchForStock: string | null;
  orderStatus: string;
  name: string;
  email: string;
  userId: string | null;
  checkoutTotals: { subtotalAmount: number; taxAmount: number; shippingAmount: number; grandTotal: number };
  fulfillment: string;
  payment: string;
  fulfillmentOption: CheckoutOptionDefinition;
  pickupBranch: string | null;
  normalizedShippingAddress: string | null;
  normalizedShippingAddressLine2: string | null;
  normalizedShippingCity: string | null;
  normalizedShippingState: string | null;
  normalizedShippingPostalCode: string | null;
  normalizedShippingCountry: string | null;
  normalizedShippingPhone: string | null;
  normalizedShippingPhone2: string | null;
  serverSubtotal: number;
  uniqueItemIds: string[];
}) {
  return await db.transaction(async (tx) => {
    const stockErrors: string[] = [];
    const stockReservations: { productId: string; quantity: number; reservation: StockReservation }[] = [];

    const productItems = opts.verifiedItems.filter((i) => i.type === 'product');
    const productIds = productItems.map((i) => i.id);

    const invMetaRecords = productIds.length > 0
      ? await tx
          .select({
            productId: schema.inventory.productId,
            stockAvailability: schema.inventory.stockAvailability,
            quantity: schema.inventory.quantity,
          })
          .from(schema.inventory)
          .where(inArray(schema.inventory.productId, productIds))
          .for('update')
      : [];
    
    const invMetaMap = new Map(invMetaRecords.map(r => [r.productId, r]));

    for (const item of opts.verifiedItems) {
      if (item.type !== 'product') continue;

      const invMeta = invMetaMap.get(item.id);

      if (!invMeta) {
        stockErrors.push(`"${item.name}" is not available for online purchase (missing inventory record).`);
        continue;
      }

      const availability = resolveEffectiveStockAvailability(
        opts.availabilityCatalog,
        invMeta.stockAvailability,
        invMeta.quantity
      );
      if (availability && !availability.allowsPurchase) {
        stockErrors.push(`"${item.name}" is currently marked as ${availability.label} and cannot be purchased.`);
        continue;
      }

      const stockResult = await reserveProductStock(tx as DbTransaction, item.id, item.quantity, {
        branchId: opts.pickupBranchForStock,
        productName: item.name,
      });

      if (!stockResult.ok) {
        stockErrors.push(stockResult.error);
      } else {
        stockReservations.push({
          productId: item.id,
          quantity: item.quantity,
          reservation: stockResult.reservation,
        });
      }
    }

    if (stockErrors.length > 0) {
      logger.warn('Checkout business validation failed', { 
        reason: 'Insufficient stock', 
        stockErrors, 
        cartItems: opts.uniqueItemIds 
      });
      return {
        success: false as const,
        error: `Insufficient stock:\n${stockErrors.join('\n')}`,
        stockErrors,
      };
    }

    // Insert Order
    const [order] = await tx
      .insert(schema.simulatedOrders)
      .values({
        customerName: opts.name,
        customerEmail: opts.email,
        customerEmailHash: hashPii(opts.email),
        customerUserId: opts.userId,
        subtotalAmount: opts.checkoutTotals.subtotalAmount,
        taxAmount: opts.checkoutTotals.taxAmount,
        shippingAmount: opts.checkoutTotals.shippingAmount,
        totalAmount: opts.checkoutTotals.grandTotal,
        status: opts.orderStatus,
        fulfillmentMethod: opts.fulfillment,
        paymentMethod: opts.payment,
        pickupBranchId: opts.fulfillmentOption.requiresBranch && opts.pickupBranch !== 'main_branch' ? opts.pickupBranch : null,
        shippingAddress: opts.fulfillmentOption.requiresBranch ? null : opts.normalizedShippingAddress,
        shippingAddressLine2: opts.fulfillmentOption.requiresBranch ? null : opts.normalizedShippingAddressLine2,
        shippingCity: opts.fulfillmentOption.requiresBranch ? null : opts.normalizedShippingCity,
        shippingState: opts.fulfillmentOption.requiresBranch ? null : opts.normalizedShippingState,
        shippingPostalCode: opts.fulfillmentOption.requiresBranch ? null : opts.normalizedShippingPostalCode,
        shippingCountry: opts.fulfillmentOption.requiresBranch ? null : opts.normalizedShippingCountry,
        shippingPhone: opts.fulfillmentOption.requiresBranch ? null : opts.normalizedShippingPhone,
        shippingPhone2: opts.fulfillmentOption.requiresBranch ? null : opts.normalizedShippingPhone2,
        stockDepleted: true,
      })
      .returning();

    if (!order) {
      throw new Error('Failed to create order record.');
    }

    // Insert Order Items
    if (opts.verifiedItems.length > 0) {
      await tx.insert(schema.simulatedOrderItems).values(
        opts.verifiedItems.map((item) => ({
          orderId: order.id,
          productId: item.id,
          productName: item.name,
          vendorOrgId: item.vendorOrgId,
          quantity: item.quantity,
          unitPrice: item.price,
        }))
      );
    }

    // Apply Stock
    for (const { productId, quantity, reservation } of stockReservations) {
      const item = opts.verifiedItems.find((v) => v.id === productId);
      if (!item) continue;

      await applyOnlineOrderItemStock(tx as DbTransaction, {
        quantity,
        reservation,
        pickupBranchId: opts.pickupBranchForStock ?? null,
        vendorOrgId: item.vendorOrgId,
        productId: item.id,
        orderId: order.id,
        userId: opts.userId || 'customer',
      });
    }

    const vendorSubtotals = new Map<string, number>();
    for (const item of opts.verifiedItems) {
      vendorSubtotals.set(
        item.vendorOrgId,
        (vendorSubtotals.get(item.vendorOrgId) || 0) + item.price * item.quantity
      );
    }

    // Update Metadata
    try {
      if (opts.userId && opts.fulfillmentOption.requiresBranch === false && opts.normalizedShippingAddress) {
        const client = await clerkClient();
        await client.users.updateUserMetadata(opts.userId, {
          privateMetadata: {
            shippingAddress: opts.normalizedShippingAddress,
            shippingAddressLine2: opts.normalizedShippingAddressLine2,
            shippingCity: opts.normalizedShippingCity,
            shippingState: opts.normalizedShippingState,
            shippingPostalCode: opts.normalizedShippingPostalCode,
            shippingCountry: opts.normalizedShippingCountry,
            shippingPhone: opts.normalizedShippingPhone,
            shippingPhone2: opts.normalizedShippingPhone2,
          },
        });
      }
    } catch (metadataError) {
      logger.error('Failed to update user private metadata during checkout', {
        error: metadataError instanceof Error ? metadataError.message : String(metadataError),
        userId: opts.userId,
      });
    }

    return {
      success: true as const,
      orderId: order.id,
      grandTotalCents: opts.checkoutTotals.grandTotal,
      vendorSubtotals: Object.fromEntries(vendorSubtotals),
      serverSubtotalCents: opts.serverSubtotal,
    };
  });
}
