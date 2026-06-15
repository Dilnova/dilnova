'use server';

import { db } from '@/shared/db/client';
import * as schema from '@/shared/db/schema';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { revalidateVendorConsole } from '@/features/vendor/revalidate';
import { auth, clerkClient } from '@clerk/nextjs/server';
import {
  createSupplierSchema,
  updateSupplierSchema,
  deleteSupplierSchema,
  adjustInventorySchema,
  updateInventoryDetailsSchema,
  createBranchSchema,
  updateBranchSchema,
  deleteBranchSchema,
  allocateBranchStockSchema,
  assignBranchMemberSchema,
  removeBranchMemberSchema,
} from '@/features/inventory/schema';
import {
  validateStockAvailabilityId,
  getStockAvailabilityCatalog,
  resolveEffectiveStockAvailability,
} from '@/features/inventory/availability.server';
import { reserveProductStock, applyStockReservation } from '@/features/inventory/reservation';
import {
  sumBranchAllocatedQuantity,
  validateBranchAllocationAgainstCentral,
  validateCentralQuantityCoversBranches,
  incrementDefaultBranchStock,
  decrementDefaultBranchStock,
} from '@/features/inventory/ledger';
import { logAuditAction } from '@/shared/audit/logger';
import { runWithCorrelationId } from '@/shared/security/async-context';
import { rateLimit } from '@/shared/security/rate-limit';
import {
  verifyVendorAccess,
  loadVendorInventoryData,
  type GetVendorInventoryDataOptions,
} from '@/features/inventory/vendor-data';
import type { VendorInventoryFullData } from '@/features/inventory/types';

export async function getVendorInventoryData(
  options?: GetVendorInventoryDataOptions
): Promise<VendorInventoryFullData> {
  return loadVendorInventoryData('full', options) as Promise<VendorInventoryFullData>;
}


// ── VENDOR INVENTORY ADJUSTMENTS ─────────────────────────────

export async function vendorAdjustInventoryAction(data: {
  inventoryId: string;
  quantityChange: number;
  type: 'restock' | 'manual_adjustment' | 'damage_loss';
  reason?: string;
}) {
  return runWithCorrelationId(async () => {
    await rateLimit(30, 60 * 1000);
    const { userId, orgId, premiumStatus } = await verifyVendorAccess();

    const parsed = adjustInventorySchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || 'Invalid input.');
    }

    const newQuantity = await db.transaction(async (tx) => {
      const [inv] = await tx
        .select({
          id: schema.inventory.id,
          quantity: schema.inventory.quantity,
          productId: schema.inventory.productId,
        })
        .from(schema.inventory)
        .innerJoin(schema.products, eq(schema.inventory.productId, schema.products.id))
        .where(and(eq(schema.inventory.id, parsed.data.inventoryId), eq(schema.products.orgId, orgId)))
        .limit(1);

      if (!inv) {
        throw new Error('Inventory record not found or access denied.');
      }

      const previousQuantity = inv.quantity;
      const nextQuantity = previousQuantity + parsed.data.quantityChange;

      if (nextQuantity < 0) {
        throw new Error(`Cannot reduce stock below 0. Current: ${previousQuantity}`);
      }

      if (premiumStatus.multiBranchActive) {
        const totalBranchAllocated = await sumBranchAllocatedQuantity(tx, inv.productId);
        const branchCheck = validateCentralQuantityCoversBranches(nextQuantity, totalBranchAllocated);
        if (!branchCheck.ok) {
          throw new Error(branchCheck.error);
        }
      }

      await tx
        .update(schema.inventory)
        .set({ quantity: nextQuantity, updatedAt: new Date() })
        .where(
          and(eq(schema.inventory.id, inv.id), eq(schema.inventory.productId, inv.productId))
        );

      await tx.insert(schema.inventoryMovements).values({
        inventoryId: parsed.data.inventoryId,
        type: parsed.data.type,
        quantityChanged: parsed.data.quantityChange,
        previousQuantity,
        newQuantity: nextQuantity,
        reason: parsed.data.reason || null,
        userId,
      });

      if (premiumStatus.multiBranchActive && parsed.data.quantityChange > 0) {
        await incrementDefaultBranchStock(
          tx,
          orgId,
          inv.productId,
          parsed.data.quantityChange
        );
      } else if (premiumStatus.multiBranchActive && parsed.data.quantityChange < 0) {
        await decrementDefaultBranchStock(
          tx,
          orgId,
          inv.productId,
          -parsed.data.quantityChange
        );
      }

      return nextQuantity;
    });

    await logAuditAction({
      userId,
      action: 'ADJUST_INVENTORY',
      targetType: 'inventory',
      targetId: parsed.data.inventoryId,
      metadata: { change: parsed.data.quantityChange, newQuantity },
    });

    revalidateVendorConsole();
    return { success: true, newQuantity };
  });
}

// ── VENDOR SUPPLIERS ─────────────────────────────────────────

export async function vendorCreateSupplierAction(data: {
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
}) {
  return runWithCorrelationId(async () => {
    await rateLimit(20, 60 * 1000);
    const { userId, orgId } = await verifyVendorAccess();

    const parsed = createSupplierSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || 'Invalid input.');
    }

    const [supplier] = await db
      .insert(schema.suppliers)
      .values({
        orgId,
        name: parsed.data.name,
        contactName: parsed.data.contactName || null,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        address: parsed.data.address || null,
      })
      .returning();

    await logAuditAction({
      userId,
      action: 'CREATE_SUPPLIER',
      targetType: 'supplier',
      targetId: supplier.id,
      metadata: { name: supplier.name, orgId },
    });

    revalidateVendorConsole();
    return { success: true, supplier };
  });
}

export async function vendorUpdateSupplierAction(data: {
  id: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
}) {
  return runWithCorrelationId(async () => {
    await rateLimit(20, 60 * 1000);
    const { userId, orgId } = await verifyVendorAccess();

    const parsed = updateSupplierSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || 'Invalid input.');
    }

    // Verify ownership
    const [existing] = await db
      .select()
      .from(schema.suppliers)
      .where(and(eq(schema.suppliers.id, parsed.data.id), eq(schema.suppliers.orgId, orgId)))
      .limit(1);

    if (!existing) {
      throw new Error('Supplier not found or access denied.');
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
      .where(and(eq(schema.suppliers.id, parsed.data.id), eq(schema.suppliers.orgId, orgId)));

    await logAuditAction({
      userId,
      action: 'UPDATE_SUPPLIER',
      targetType: 'supplier',
      targetId: parsed.data.id,
      metadata: { name: parsed.data.name },
    });

    revalidateVendorConsole();
    return { success: true };
  });
}

export async function vendorDeleteSupplierAction(id: string) {
  return runWithCorrelationId(async () => {
    await rateLimit(20, 60 * 1000);
    const { userId, orgId } = await verifyVendorAccess();

    const parsed = deleteSupplierSchema.safeParse({ id });
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || 'Invalid input.');
    }

    const result = await db
      .delete(schema.suppliers)
      .where(and(eq(schema.suppliers.id, parsed.data.id), eq(schema.suppliers.orgId, orgId)))
      .returning();

    if (result.length === 0) {
      throw new Error('Supplier not found or access denied.');
    }

    await logAuditAction({
      userId,
      action: 'DELETE_SUPPLIER',
      targetType: 'supplier',
      targetId: parsed.data.id,
    });

    revalidateVendorConsole();
    return { success: true };
  });
}

// ── VENDOR INIT INVENTORY ────────────────────────────────────

export async function vendorInitInventoryAction(data: {
  productId: string;
  sku?: string;
  quantity?: number;
  lowStockThreshold?: number;
  binLocation?: string;
  supplierId?: string | null;
  stockAvailability?: string;
}) {
  return runWithCorrelationId(async () => {
    await rateLimit(20, 60 * 1000);
    const { userId, orgId } = await verifyVendorAccess();

    if (!data.productId) throw new Error('Product ID is required.');

    // Verify product belongs to this vendor org
    const [prod] = await db
      .select()
      .from(schema.products)
      .where(and(eq(schema.products.id, data.productId), eq(schema.products.orgId, orgId)))
      .limit(1);

    if (!prod) {
      throw new Error('Product not found or access denied.');
    }

    if (data.supplierId) {
      const [supplier] = await db
        .select({ id: schema.suppliers.id })
        .from(schema.suppliers)
        .where(and(eq(schema.suppliers.id, data.supplierId), eq(schema.suppliers.orgId, orgId)))
        .limit(1);

      if (!supplier) {
        throw new Error('Supplier not found or access denied.');
      }
    }

    // Check if inventory already exists for this product
    const existing = await db
      .select({ id: schema.inventory.id })
      .from(schema.inventory)
      .where(eq(schema.inventory.productId, data.productId))
      .limit(1);

    if (existing.length > 0) {
      throw new Error('Inventory record already exists.');
    }

    const quantity = data.quantity ?? 0;
    const availability = await validateStockAvailabilityId(data.stockAvailability || 'in_stock');
    if (!availability) {
      throw new Error('Invalid stock availability status.');
    }

    const [inv] = await db
      .insert(schema.inventory)
      .values({
        productId: data.productId,
        sku: data.sku || null,
        quantity,
        lowStockThreshold: data.lowStockThreshold ?? 5,
        binLocation: data.binLocation || null,
        supplierId: data.supplierId || null,
        stockAvailability: availability.id,
      })
      .returning();

    if (inv && quantity > 0) {
      await db.insert(schema.inventoryMovements).values({
        inventoryId: inv.id,
        type: 'restock',
        quantityChanged: quantity,
        previousQuantity: 0,
        newQuantity: quantity,
        reason: 'Initial setup',
        userId,
      });
    }

    await logAuditAction({
      userId,
      action: 'CREATE_INVENTORY',
      targetType: 'inventory',
      targetId: inv.id,
      metadata: { productId: data.productId, quantity },
    });

    revalidateVendorConsole();
    return { success: true, inventory: inv };
  });
}

// ── VENDOR BRANCH CRUD (Premium Multi-Branch) ────────────────

export async function createBranchAction(data: { name: string; address?: string; phone?: string }) {
  return runWithCorrelationId(async () => {
    const { userId, orgId, premiumStatus } = await verifyVendorAccess();
    if (!premiumStatus.multiBranchActive) {
      throw new Error('Multi-branch stock tracking is not unlocked on your account tier.');
    }

    const parsed = createBranchSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || 'Invalid input.');
    }

    // Check if default exists, if not this is default
    const existingDefault = await db
      .select({ id: schema.branches.id })
      .from(schema.branches)
      .where(and(eq(schema.branches.orgId, orgId), eq(schema.branches.isDefault, true)))
      .limit(1);

    const isDefault = existingDefault.length === 0;

    const [branch] = await db
      .insert(schema.branches)
      .values({
        orgId,
        name: parsed.data.name,
        address: parsed.data.address || null,
        phone: parsed.data.phone || null,
        isDefault,
      })
      .returning();

    await logAuditAction({
      userId,
      action: 'CREATE_BRANCH',
      targetType: 'branch',
      targetId: branch.id,
      metadata: { name: branch.name, isDefault },
    });

    revalidateVendorConsole();
    return { success: true, branch };
  });
}

export async function updateBranchAction(data: { id: string; name: string; address?: string; phone?: string }) {
  return runWithCorrelationId(async () => {
    const { userId, orgId, premiumStatus } = await verifyVendorAccess();
    if (!premiumStatus.multiBranchActive) {
      throw new Error('Multi-branch stock tracking is not unlocked on your account tier.');
    }

    const parsed = updateBranchSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || 'Invalid input.');
    }

    const [branch] = await db
      .update(schema.branches)
      .set({
        name: parsed.data.name,
        address: parsed.data.address || null,
        phone: parsed.data.phone || null,
        updatedAt: new Date(),
      })
      .where(and(eq(schema.branches.id, parsed.data.id), eq(schema.branches.orgId, orgId)))
      .returning();

    if (!branch) {
      throw new Error('Branch not found or access denied.');
    }

    await logAuditAction({
      userId,
      action: 'UPDATE_BRANCH',
      targetType: 'branch',
      targetId: parsed.data.id,
      metadata: { name: parsed.data.name },
    });

    revalidateVendorConsole();
    return { success: true };
  });
}

export async function deleteBranchAction(id: string) {
  return runWithCorrelationId(async () => {
    const { userId, orgId, premiumStatus } = await verifyVendorAccess();
    if (!premiumStatus.multiBranchActive) {
      throw new Error('Multi-branch stock tracking is not unlocked.');
    }

    const parsed = deleteBranchSchema.safeParse({ id });
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || 'Invalid input.');
    }

    // Don't delete if it is default
    const [branch] = await db
      .select()
      .from(schema.branches)
      .where(and(eq(schema.branches.id, parsed.data.id), eq(schema.branches.orgId, orgId)))
      .limit(1);

    if (!branch) {
      throw new Error('Branch not found or access denied.');
    }

    if (branch.isDefault) {
      throw new Error('Cannot delete the default Main Warehouse branch.');
    }

    await db
      .delete(schema.branches)
      .where(and(eq(schema.branches.id, parsed.data.id), eq(schema.branches.orgId, orgId)));

    await logAuditAction({
      userId,
      action: 'DELETE_BRANCH',
      targetType: 'branch',
      targetId: parsed.data.id,
    });

    revalidateVendorConsole();
    return { success: true };
  });
}

// Allocate stock to a specific branch (adjust stock level)
export async function allocateBranchStockAction(data: {
  branchId: string;
  productId: string;
  quantity: number;
  sku?: string;
  binLocation?: string;
}) {
  return runWithCorrelationId(async () => {
    const { userId, orgId, premiumStatus } = await verifyVendorAccess();
    if (!premiumStatus.multiBranchActive) {
      throw new Error('Multi-branch stock tracking is not unlocked.');
    }

    const parsed = allocateBranchStockSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || 'Invalid input.');
    }

    // Verify branch belongs to vendor org
    const [branch] = await db
      .select({ id: schema.branches.id })
      .from(schema.branches)
      .where(and(eq(schema.branches.id, parsed.data.branchId), eq(schema.branches.orgId, orgId)))
      .limit(1);

    if (!branch) {
      throw new Error('Branch not found or access denied.');
    }

    // Verify product belongs to vendor org
    const [product] = await db
      .select({ id: schema.products.id })
      .from(schema.products)
      .where(and(eq(schema.products.id, parsed.data.productId), eq(schema.products.orgId, orgId)))
      .limit(1);

    if (!product) {
      throw new Error('Product not found or access denied.');
    }

    const [centralInv] = await db
      .select({ quantity: schema.inventory.quantity })
      .from(schema.inventory)
      .where(eq(schema.inventory.productId, parsed.data.productId))
      .limit(1);

    if (!centralInv) {
      throw new Error('Central inventory record not found for this product.');
    }

    const otherBranchesAllocated = await sumBranchAllocatedQuantity(
      db,
      parsed.data.productId,
      { excludeBranchId: parsed.data.branchId }
    );
    const allocationCheck = validateBranchAllocationAgainstCentral(
      centralInv.quantity,
      otherBranchesAllocated,
      parsed.data.quantity
    );
    if (!allocationCheck.ok) {
      throw new Error(allocationCheck.error);
    }

    // Upsert branch inventory
    const [existing] = await db
      .select()
      .from(schema.branchInventory)
      .where(and(eq(schema.branchInventory.branchId, parsed.data.branchId), eq(schema.branchInventory.productId, parsed.data.productId)))
      .limit(1);

    if (existing) {
      await db
        .update(schema.branchInventory)
        .set({
          quantity: parsed.data.quantity,
          sku: parsed.data.sku || null,
          binLocation: parsed.data.binLocation || null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.branchInventory.id, existing.id),
            eq(schema.branchInventory.branchId, parsed.data.branchId)
          )
        );
    } else {
      await db.insert(schema.branchInventory).values({
        branchId: parsed.data.branchId,
        productId: parsed.data.productId,
        quantity: parsed.data.quantity,
        sku: parsed.data.sku || null,
        binLocation: parsed.data.binLocation || null,
      });
    }

    revalidateVendorConsole();
    return { success: true };
  });
}

// ── BRANCH MEMBER ASSIGNMENT ─────────────────────────────────

export async function assignBranchMemberAction(data: { branchId: string; memberUserId: string; role: 'cashier' | 'manager' }) {
  return runWithCorrelationId(async () => {
    const { userId, orgId, premiumStatus } = await verifyVendorAccess();
    if (!premiumStatus.multiBranchActive) {
      throw new Error('Multi-branch features are not unlocked.');
    }

    const parsed = assignBranchMemberSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || 'Invalid input.');
    }

    // Check branch ownership
    const [branch] = await db
      .select({ id: schema.branches.id })
      .from(schema.branches)
      .where(and(eq(schema.branches.id, parsed.data.branchId), eq(schema.branches.orgId, orgId)))
      .limit(1);

    if (!branch) {
      throw new Error('Branch not found or access denied.');
    }

    const client = await clerkClient();
    const memberships = await client.organizations.getOrganizationMembershipList({
      organizationId: orgId,
      limit: 100,
    });
    const isOrgMember = memberships.data.some(
      (membership) => membership.publicUserData?.userId === parsed.data.memberUserId
    );
    if (!isOrgMember) {
      throw new Error('Selected user is not a member of this organization.');
    }

    // Check if user is already assigned to a branch
    const [existing] = await db
      .select()
      .from(schema.branchMembers)
      .where(and(eq(schema.branchMembers.branchId, parsed.data.branchId), eq(schema.branchMembers.memberUserId, parsed.data.memberUserId)))
      .limit(1);

    if (existing) {
      await db
        .update(schema.branchMembers)
        .set({ role: parsed.data.role })
        .where(
          and(
            eq(schema.branchMembers.id, existing.id),
            eq(schema.branchMembers.branchId, parsed.data.branchId)
          )
        );
    } else {
      await db.insert(schema.branchMembers).values({
        branchId: parsed.data.branchId,
        memberUserId: parsed.data.memberUserId,
        role: parsed.data.role,
      });
    }

    revalidateVendorConsole();
    return { success: true };
  });
}

export async function removeBranchMemberAction(id: string) {
  return runWithCorrelationId(async () => {
    const { userId, orgId, premiumStatus } = await verifyVendorAccess();
    if (!premiumStatus.multiBranchActive) {
      throw new Error('Multi-branch features are not unlocked.');
    }

    const parsed = removeBranchMemberSchema.safeParse({ id });
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || 'Invalid input.');
    }

    // Verify branch belongs to vendor org
    const [member] = await db
      .select({
        id: schema.branchMembers.id,
        branchId: schema.branchMembers.branchId,
      })
      .from(schema.branchMembers)
      .innerJoin(schema.branches, eq(schema.branchMembers.branchId, schema.branches.id))
      .where(and(eq(schema.branchMembers.id, parsed.data.id), eq(schema.branches.orgId, orgId)))
      .limit(1);

    if (!member) {
      throw new Error('Record not found or access denied.');
    }

    await db
      .delete(schema.branchMembers)
      .where(
        and(eq(schema.branchMembers.id, member.id), eq(schema.branchMembers.branchId, member.branchId))
      );

    revalidateVendorConsole();
    return { success: true };
  });
}

