'use server';

import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import {
  createSupplierSchema,
  updateSupplierSchema,
  deleteSupplierSchema,
  adjustInventorySchema,
  updateInventoryDetailsSchema,
  updateSimulatedOrderStatusSchema,
  updateImsLicenseSchema,
} from '@/utils/schemas';
import { checkSuperAdmin } from '@/utils/authGuards';
import { logAuditAction } from '@/utils/auditLogger';
import { runWithCorrelationId } from '@/utils/asyncContext';
import { validateStockAvailabilityId } from '@/utils/stockAvailability';
import { rateLimit } from '@/utils/rateLimit';

// ── SUPPLIER CRUD ─────────────────────────────────────────────

export async function createSupplierAction(data: {
  orgId: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
}) {
  return runWithCorrelationId(async () => {
    await rateLimit(20, 60 * 1000);
    const user = await checkSuperAdmin();

    const parsed = createSupplierSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || 'Invalid input.');
    }

    if (!data.orgId) {
      throw new Error('Organization ID is required.');
    }

    const [supplier] = await db
      .insert(schema.suppliers)
      .values({
        orgId: data.orgId,
        name: parsed.data.name,
        contactName: parsed.data.contactName || null,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        address: parsed.data.address || null,
      })
      .returning();

    if (supplier) {
      await logAuditAction({
        userId: user.id,
        action: 'CREATE_SUPPLIER',
        targetType: 'supplier',
        targetId: supplier.id,
        metadata: { name: supplier.name, orgId: supplier.orgId },
      });
    }

    revalidatePath('/superadmin');
    return { success: true, supplier };
  });
}

export async function updateSupplierAction(data: {
  id: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
}) {
  return runWithCorrelationId(async () => {
    await rateLimit(20, 60 * 1000);
    const user = await checkSuperAdmin();

    const parsed = updateSupplierSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || 'Invalid input.');
    }

    await db
      .update(schema.suppliers)
      .set({
        name: parsed.data.name,
        contactName: parsed.data.contactName || null,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        address: parsed.data.address || null,
      })
      .where(eq(schema.suppliers.id, parsed.data.id));

    await logAuditAction({
      userId: user.id,
      action: 'UPDATE_SUPPLIER',
      targetType: 'supplier',
      targetId: parsed.data.id,
      metadata: { name: parsed.data.name },
    });

    revalidatePath('/superadmin');
    return { success: true };
  });
}

export async function deleteSupplierAction(id: string) {
  return runWithCorrelationId(async () => {
    await rateLimit(20, 60 * 1000);
    const user = await checkSuperAdmin();

    const parsed = deleteSupplierSchema.safeParse({ id });
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || 'Invalid input.');
    }

    await db.delete(schema.suppliers).where(eq(schema.suppliers.id, parsed.data.id));

    await logAuditAction({
      userId: user.id,
      action: 'DELETE_SUPPLIER',
      targetType: 'supplier',
      targetId: parsed.data.id,
    });

    revalidatePath('/superadmin');
    return { success: true };
  });
}

// ── INVENTORY ADJUSTMENTS ─────────────────────────────────────

export async function adjustInventoryAction(data: {
  inventoryId: string;
  quantityChange: number;
  type: 'restock' | 'manual_adjustment' | 'damage_loss';
  reason?: string;
}) {
  return runWithCorrelationId(async () => {
    await rateLimit(20, 60 * 1000);
    const user = await checkSuperAdmin();

    const parsed = adjustInventorySchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || 'Invalid input.');
    }

    // Fetch current inventory
    const [inv] = await db
      .select()
      .from(schema.inventory)
      .where(eq(schema.inventory.id, parsed.data.inventoryId))
      .limit(1);

    if (!inv) {
      throw new Error('Inventory record not found.');
    }

    const previousQuantity = inv.quantity;
    const newQuantity = previousQuantity + parsed.data.quantityChange;

    if (newQuantity < 0) {
      throw new Error(`Cannot reduce stock below 0. Current: ${previousQuantity}, Change: ${parsed.data.quantityChange}`);
    }

    // Update quantity
    await db
      .update(schema.inventory)
      .set({ quantity: newQuantity, updatedAt: new Date() })
      .where(eq(schema.inventory.id, parsed.data.inventoryId));

    // Log movement
    await db.insert(schema.inventoryMovements).values({
      inventoryId: parsed.data.inventoryId,
      type: parsed.data.type,
      quantityChanged: parsed.data.quantityChange,
      previousQuantity,
      newQuantity,
      reason: parsed.data.reason || null,
      userId: user.id,
    });

    await logAuditAction({
      userId: user.id,
      action: 'ADJUST_INVENTORY',
      targetType: 'inventory',
      targetId: parsed.data.inventoryId,
      metadata: {
        type: parsed.data.type,
        change: parsed.data.quantityChange,
        previousQuantity,
        newQuantity,
        reason: parsed.data.reason,
      },
    });

    revalidatePath('/superadmin');
    return { success: true, newQuantity };
  });
}

export async function updateInventoryDetailsAction(data: {
  inventoryId: string;
  sku?: string;
  lowStockThreshold?: number;
  binLocation?: string;
  supplierId?: string | null;
  stockAvailability?: string;
}) {
  return runWithCorrelationId(async () => {
    await rateLimit(20, 60 * 1000);
    const user = await checkSuperAdmin();

    const parsed = updateInventoryDetailsSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || 'Invalid input.');
    }

    const setClause: Partial<typeof schema.inventory.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (parsed.data.sku !== undefined) setClause.sku = parsed.data.sku;
    if (parsed.data.lowStockThreshold !== undefined) setClause.lowStockThreshold = parsed.data.lowStockThreshold;
    if (parsed.data.binLocation !== undefined) setClause.binLocation = parsed.data.binLocation;
    if (parsed.data.supplierId !== undefined) setClause.supplierId = parsed.data.supplierId;
    if (parsed.data.stockAvailability !== undefined) {
      const availability = await validateStockAvailabilityId(parsed.data.stockAvailability);
      if (!availability) {
        throw new Error('Invalid stock availability status.');
      }
      setClause.stockAvailability = availability.id;
    }

    await db
      .update(schema.inventory)
      .set(setClause)
      .where(eq(schema.inventory.id, parsed.data.inventoryId));

    await logAuditAction({
      userId: user.id,
      action: 'UPDATE_INVENTORY_DETAILS',
      targetType: 'inventory',
      targetId: parsed.data.inventoryId,
      metadata: { updates: parsed.data },
    });

    revalidatePath('/superadmin');
    return { success: true };
  });
}

// Create inventory record for a product that doesn't have one yet
export async function createInventoryForProductAction(data: {
  productId: string;
  sku?: string;
  quantity?: number;
  lowStockThreshold?: number;
  binLocation?: string;
  supplierId?: string | null;
}) {
  return runWithCorrelationId(async () => {
    await rateLimit(20, 60 * 1000);
    const user = await checkSuperAdmin();

    if (!data.productId) throw new Error('Product ID is required.');

    // Check if inventory already exists for this product
    const existing = await db
      .select({ id: schema.inventory.id })
      .from(schema.inventory)
      .where(eq(schema.inventory.productId, data.productId))
      .limit(1);

    if (existing.length > 0) {
      throw new Error('Inventory record already exists for this product.');
    }

    const quantity = data.quantity ?? 0;

    const [inv] = await db
      .insert(schema.inventory)
      .values({
        productId: data.productId,
        sku: data.sku || null,
        quantity,
        lowStockThreshold: data.lowStockThreshold ?? 5,
        binLocation: data.binLocation || null,
        supplierId: data.supplierId || null,
        stockAvailability: 'in_stock',
      })
      .returning();

    // Log initial stock movement if quantity > 0
    if (inv && quantity > 0) {
      await db.insert(schema.inventoryMovements).values({
        inventoryId: inv.id,
        type: 'restock',
        quantityChanged: quantity,
        previousQuantity: 0,
        newQuantity: quantity,
        reason: 'Initial stock setup',
        userId: user.id,
      });
    }

    if (inv) {
      await logAuditAction({
        userId: user.id,
        action: 'CREATE_INVENTORY',
        targetType: 'inventory',
        targetId: inv.id,
        metadata: { productId: data.productId, quantity },
      });
    }

    revalidatePath('/superadmin');
    return { success: true, inventory: inv };
  });
}

// ── SIMULATED ORDER STATUS MANAGEMENT ─────────────────────────

export async function updateSimulatedOrderStatusAction(
  orderId: string,
  newStatus: 'pending' | 'fulfilled' | 'cancelled'
) {
  return runWithCorrelationId(async () => {
    await rateLimit(20, 60 * 1000);
    const user = await checkSuperAdmin();

    const parsed = updateSimulatedOrderStatusSchema.safeParse({ orderId, status: newStatus });
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || 'Invalid input.');
    }

    // Fetch current order
    const [order] = await db
      .select()
      .from(schema.simulatedOrders)
      .where(eq(schema.simulatedOrders.id, parsed.data.orderId))
      .limit(1);

    if (!order) {
      throw new Error('Order not found.');
    }

    const previousStatus = order.status;

    // If cancelling a pending order, restore inventory
    if (newStatus === 'cancelled' && previousStatus === 'pending') {
      const orderItems = await db
        .select()
        .from(schema.simulatedOrderItems)
        .where(eq(schema.simulatedOrderItems.orderId, parsed.data.orderId));

      for (const item of orderItems) {
        const [inv] = await db
          .select()
          .from(schema.inventory)
          .where(eq(schema.inventory.productId, item.productId))
          .limit(1);

        if (inv) {
          const prevQty = inv.quantity;
          const newQty = prevQty + item.quantity;

          await db
            .update(schema.inventory)
            .set({ quantity: newQty, updatedAt: new Date() })
            .where(eq(schema.inventory.id, inv.id));

          await db.insert(schema.inventoryMovements).values({
            inventoryId: inv.id,
            type: 'order_cancellation',
            quantityChanged: item.quantity,
            previousQuantity: prevQty,
            newQuantity: newQty,
            reason: `Order ${parsed.data.orderId} cancelled by superadmin`,
            userId: user.id,
          });
        }
      }
    }

    // Update the order status
    await db
      .update(schema.simulatedOrders)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(schema.simulatedOrders.id, parsed.data.orderId));

    await logAuditAction({
      userId: user.id,
      action: 'UPDATE_ORDER_STATUS',
      targetType: 'simulated_order',
      targetId: parsed.data.orderId,
      metadata: { previousStatus, newStatus },
    });

    revalidatePath('/superadmin');
    return { success: true };
  });
}

export async function updateOrgImsLicenseAction(data: {
  organizationId: string;
  imsEnabled: boolean;
  imsExpiresAt: string | null;
  imsMultiBranchEnabled: boolean;
  imsBillingEnabled: boolean;
}) {
  return runWithCorrelationId(async () => {
    const user = await checkSuperAdmin();

    const parsed = updateImsLicenseSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || 'Invalid input.');
    }

    const { updateOrgImsLicense } = await import('@/utils/premiumLicense');

    await updateOrgImsLicense(parsed.data.organizationId, {
      imsEnabled: parsed.data.imsEnabled,
      imsExpiresAt: parsed.data.imsExpiresAt,
      imsMultiBranchEnabled: parsed.data.imsMultiBranchEnabled,
      imsBillingEnabled: parsed.data.imsBillingEnabled,
    });

    await logAuditAction({
      userId: user.id,
      action: 'UPDATE_IMS_LICENSE',
      targetType: 'vendor',
      targetId: parsed.data.organizationId,
      metadata: parsed.data,
    });

    revalidatePath('/superadmin');
    return { success: true };
  });
}

