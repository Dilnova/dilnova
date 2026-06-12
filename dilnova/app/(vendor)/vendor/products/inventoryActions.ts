'use server';

import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { revalidateVendorConsole } from '@/utils/revalidateVendorConsole';
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
  processBillingCheckoutSchema,
} from '@/utils/schemas';
import { getPremiumStatus } from '@/utils/premiumLicense';
import { validateStockAvailabilityId } from '@/utils/stockAvailability';
import { reserveProductStock, applyStockReservation } from '@/utils/inventoryStock';
import {
  sumBranchAllocatedQuantity,
  validateBranchAllocationAgainstCentral,
  validateCentralQuantityCoversBranches,
  incrementDefaultBranchStock,
  decrementDefaultBranchStock,
} from '@/utils/stockLedger';
import {
  getStockAvailabilityCatalog,
  resolveEffectiveStockAvailability,
} from '@/utils/stockAvailability';
import { logAuditAction } from '@/utils/auditLogger';
import { runWithCorrelationId } from '@/utils/asyncContext';
import { rateLimit } from '@/utils/rateLimit';
import { getCheckoutOptionsCatalog } from '@/utils/checkoutOptions';

// Helper to authenticate vendor context and check premium status
async function verifyVendorAccess(options?: { allowMember?: boolean }) {
  const { userId, orgId, orgRole } = await auth();
  if (!userId || !orgId) {
    throw new Error('Not authorized: You must be signed in with an active organization.');
  }

  const allowMember = options?.allowMember === true;
  if (allowMember) {
    if (orgRole !== 'org:admin' && orgRole !== 'org:member') {
      throw new Error('Not authorized: You do not have access to this organization.');
    }
  } else if (orgRole !== 'org:admin') {
    throw new Error('Not authorized: Only organization admins can perform this action.');
  }

  const premiumStatus = await getPremiumStatus(orgId);
  if (!premiumStatus.imsActive) {
    throw new Error('Inventory Management System access is disabled or expired.');
  }

  return { userId, orgId, orgRole, premiumStatus };
}

// ── GET VENDOR IMS DATA ──────────────────────────────────────

export async function getVendorInventoryData(options?: { allowMember?: boolean }) {
  return runWithCorrelationId(async () => {
    const { userId, orgId, orgRole, premiumStatus } = await verifyVendorAccess({
      allowMember: options?.allowMember === true,
    });

    // 1. Fetch Products
    const vendorProducts = await db
      .select({
        id: schema.products.id,
        name: schema.products.name,
        type: schema.products.type,
        orgId: schema.products.orgId,
      })
      .from(schema.products)
      .where(eq(schema.products.orgId, orgId));

    const productIds = vendorProducts.map((p) => p.id);

    // 2. Fetch Central Inventory (with auto-initialization of missing records)
    let inventoryItems: any[] = [];
    if (productIds.length > 0) {
      // Find which products already have an inventory tracking record
      const existingInventory = await db
        .select({
          productId: schema.inventory.productId,
        })
        .from(schema.inventory)
        .where(inArray(schema.inventory.productId, productIds));

      const trackedProductIdsSet = new Set(existingInventory.map((i) => i.productId));

      // Identify products of type 'product' that do not have an inventory row yet
      const missingInventoryProducts = vendorProducts.filter(
        (p) => p.type === 'product' && !trackedProductIdsSet.has(p.id)
      );

      // Bulk initialize missing inventory records
      if (missingInventoryProducts.length > 0) {
        await db.insert(schema.inventory).values(
          missingInventoryProducts.map((p) => ({
            productId: p.id,
            sku: null,
            quantity: 0,
            lowStockThreshold: 5,
            binLocation: null,
            supplierId: null,
            stockAvailability: 'in_stock',
          }))
        );
      }

      // Fetch the full inventory records list (left joining products so both products and services are fetched)
      inventoryItems = await db
        .select({
          id: schema.inventory.id,
          productId: schema.products.id,
          sku: schema.inventory.sku,
          quantity: schema.inventory.quantity,
          lowStockThreshold: schema.inventory.lowStockThreshold,
          binLocation: schema.inventory.binLocation,
          supplierId: schema.inventory.supplierId,
          stockAvailability: schema.inventory.stockAvailability,
          updatedAt: schema.inventory.updatedAt,
          productName: schema.products.name,
          productType: schema.products.type,
          productPrice: schema.products.price,
          supplierName: schema.suppliers.name,
        })
        .from(schema.products)
        .leftJoin(schema.inventory, eq(schema.products.id, schema.inventory.productId))
        .leftJoin(schema.suppliers, eq(schema.inventory.supplierId, schema.suppliers.id))
        .where(eq(schema.products.orgId, orgId));
    }

    const trackedProductIds = new Set(inventoryItems.map((i) => i.productId));
    const productsWithoutInventory = vendorProducts.filter((p) => !trackedProductIds.has(p.id) && p.type === 'product');

    // 3. Fetch Suppliers
    const suppliers = await db
      .select()
      .from(schema.suppliers)
      .where(eq(schema.suppliers.orgId, orgId));

    // 4. Fetch Inventory Movements
    let movements: any[] = [];
    if (inventoryItems.length > 0) {
      const inventoryIds = inventoryItems.map((i) => i.id);
      movements = await db
        .select({
          id: schema.inventoryMovements.id,
          inventoryId: schema.inventoryMovements.inventoryId,
          type: schema.inventoryMovements.type,
          quantityChanged: schema.inventoryMovements.quantityChanged,
          previousQuantity: schema.inventoryMovements.previousQuantity,
          newQuantity: schema.inventoryMovements.newQuantity,
          reason: schema.inventoryMovements.reason,
          userId: schema.inventoryMovements.userId,
          createdAt: schema.inventoryMovements.createdAt,
          productName: schema.products.name,
        })
        .from(schema.inventoryMovements)
        .innerJoin(schema.inventory, eq(schema.inventoryMovements.inventoryId, schema.inventory.id))
        .innerJoin(schema.products, eq(schema.inventory.productId, schema.products.id))
        .where(inArray(schema.inventoryMovements.inventoryId, inventoryIds))
        .orderBy(desc(schema.inventoryMovements.createdAt))
        .limit(100);
    }

    // 5. Fetch Simulated Orders
    let simulatedOrders: any[] = [];
    if (productIds.length > 0) {
      // Find orders that contain at least one item from this vendor
      const relatedItems = await db
        .select()
        .from(schema.simulatedOrderItems)
        .where(eq(schema.simulatedOrderItems.vendorOrgId, orgId));

      const orderIds = Array.from(new Set(relatedItems.map((item) => item.orderId)));

      if (orderIds.length > 0) {
        const ordersList = await db
          .select()
          .from(schema.simulatedOrders)
          .where(inArray(schema.simulatedOrders.id, orderIds))
          .orderBy(desc(schema.simulatedOrders.createdAt));

        // Attach items
        const branchNameById = new Map(
          (await db
            .select({ id: schema.branches.id, name: schema.branches.name })
            .from(schema.branches)
            .where(eq(schema.branches.orgId, orgId)))
            .map((branch) => [branch.id, branch.name])
        );

        simulatedOrders = ordersList.map((o) => ({
          ...o,
          items: relatedItems.filter((ri) => ri.orderId === o.id),
          pickupBranchName: o.pickupBranchId ? branchNameById.get(o.pickupBranchId) ?? null : null,
        }));
      }
    }

    // 6. Fetch Branches (Premium Multi-Branch, or single default fallback if billing is active)
    let branches: any[] = [];
    let branchInventoryList: any[] = [];
    let branchMembersList: any[] = [];
    if (premiumStatus.multiBranchActive || premiumStatus.billingActive) {
      let allBranches = await db
        .select()
        .from(schema.branches)
        .where(eq(schema.branches.orgId, orgId))
        .orderBy(schema.branches.name);

      // If no branches exist, programmatically insert a default branch record named "Main Register"
      if (allBranches.length === 0) {
        const [defaultBranch] = await db
          .insert(schema.branches)
          .values({
            orgId,
            name: 'Main Register',
            isDefault: true,
          })
          .returning();
        if (defaultBranch) {
          allBranches = [defaultBranch];
        }
      }

      // Auto-migrate/initialize default branch inventory for ongoing shop records in multi-branch mode
      if (premiumStatus.multiBranchActive) {
        const defaultBranch = allBranches.find((b) => b.isDefault) || allBranches[0];
        if (defaultBranch) {
          const existingDefaultInv = await db
            .select({ productId: schema.branchInventory.productId })
            .from(schema.branchInventory)
            .where(eq(schema.branchInventory.branchId, defaultBranch.id));
          const defaultProductIdsSet = new Set(existingDefaultInv.map((bi) => bi.productId));

          const missingDefaultBranchInv = inventoryItems.filter(
            (item) => item.productType === 'product' && !defaultProductIdsSet.has(item.productId)
          );

          if (missingDefaultBranchInv.length > 0) {
            await db.insert(schema.branchInventory).values(
              missingDefaultBranchInv.map((item) => ({
                branchId: defaultBranch.id,
                productId: item.productId,
                quantity: item.quantity ?? 0,
                sku: item.sku,
                binLocation: item.binLocation,
              }))
            );
          }
        }
      }

      // Filter branches for non-admin users if multi-branch is active
      if (premiumStatus.multiBranchActive && orgRole !== 'org:admin') {
        const memberAssignments = await db
          .select({ branchId: schema.branchMembers.branchId })
          .from(schema.branchMembers)
          .where(eq(schema.branchMembers.memberUserId, userId));

        const assignedIds = new Set(memberAssignments.map((a) => a.branchId));
        branches = allBranches.filter((b) => assignedIds.has(b.id));
      } else {
        branches = allBranches;
      }

      const branchIds = branches.map((b) => b.id);
      if (branchIds.length > 0) {
        if (premiumStatus.multiBranchActive) {
          branchInventoryList = await db
            .select({
              id: schema.branchInventory.id,
              branchId: schema.branchInventory.branchId,
              productId: schema.branchInventory.productId,
              sku: schema.branchInventory.sku,
              quantity: schema.branchInventory.quantity,
              binLocation: schema.branchInventory.binLocation,
              productName: schema.products.name,
            })
            .from(schema.branchInventory)
            .innerJoin(schema.products, eq(schema.branchInventory.productId, schema.products.id))
            .where(inArray(schema.branchInventory.branchId, branchIds));
        } else {
          // Fallback: Populate the branchInventory list using central inventory so the default branch register has access to central stock
          const defaultBranchId = branches[0].id;
          branchInventoryList = inventoryItems.map((invItem) => ({
            id: invItem.id,
            branchId: defaultBranchId,
            productId: invItem.productId,
            sku: invItem.sku,
            quantity: invItem.quantity,
            binLocation: invItem.binLocation,
            productName: invItem.productName,
          }));
        }

        branchMembersList = await db
          .select()
          .from(schema.branchMembers)
          .where(inArray(schema.branchMembers.branchId, branchIds));
      }
    }

    // 7. Fetch Billing Receipts (Premium POS Register)
    let billingReceipts: any[] = [];
    if (premiumStatus.billingActive) {
      billingReceipts = await db
        .select()
        .from(schema.billingReceipts)
        .where(eq(schema.billingReceipts.orgId, orgId))
        .orderBy(desc(schema.billingReceipts.createdAt))
        .limit(50);
    }

    // Fetch org members list from Clerk for display in branch mapping (filter out org admins)
    let orgMembers: { userId: string; name: string; email: string }[] = [];
    try {
      const client = await clerkClient();
      const memberships = await client.organizations.getOrganizationMembershipList({ organizationId: orgId });
      orgMembers = memberships.data
        .filter((m) => m.role !== 'org:admin' && m.publicUserData?.userId)
        .map((m) => ({
          userId: m.publicUserData?.userId || '',
          name: `${m.publicUserData?.firstName || ''} ${m.publicUserData?.lastName || ''}`.trim() || m.publicUserData?.identifier || 'Unknown Member',
          email: m.publicUserData?.identifier || '',
        }));
    } catch (err) {
      // Graceful degradation
    }

    const checkoutOptionsCatalog = await getCheckoutOptionsCatalog();
    const stockAvailabilityCatalog = await getStockAvailabilityCatalog();

    return {
      inventoryItems,
      suppliers,
      movements,
      simulatedOrders,
      productsWithoutInventory,
      branches,
      branchInventory: branchInventoryList,
      branchMembers: branchMembersList,
      billingReceipts,
      orgMembers,
      premiumStatus,
      checkoutOptionsCatalog,
      stockAvailabilityCatalog,
    };
  });
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
    const { userId, orgId } = await verifyVendorAccess();
    const premiumStatus = await getPremiumStatus(orgId);

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
        .where(eq(schema.inventory.id, parsed.data.inventoryId));

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
      .where(eq(schema.suppliers.id, parsed.data.id));

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

    await db.delete(schema.branches).where(eq(schema.branches.id, parsed.data.id));

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
        .where(eq(schema.branchInventory.id, existing.id));
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
        .where(eq(schema.branchMembers.id, existing.id));
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
      .select({ id: schema.branchMembers.id })
      .from(schema.branchMembers)
      .innerJoin(schema.branches, eq(schema.branchMembers.branchId, schema.branches.id))
      .where(and(eq(schema.branchMembers.id, parsed.data.id), eq(schema.branches.orgId, orgId)))
      .limit(1);

    if (!member) {
      throw new Error('Record not found or access denied.');
    }

    await db.delete(schema.branchMembers).where(eq(schema.branchMembers.id, parsed.data.id));

    revalidateVendorConsole();
    return { success: true };
  });
}

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
