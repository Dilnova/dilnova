'use server';

import { db } from '@/shared/db/client';
import * as schema from '@/shared/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { revalidateVendorConsole } from '@/features/vendor/revalidate';
import { clerkClient } from '@clerk/nextjs/server';
import {
  createBranchSchema,
  updateBranchSchema,
  deleteBranchSchema,
  allocateBranchStockSchema,
  assignBranchMemberSchema,
  removeBranchMemberSchema,
} from '@/features/inventory/schema';
import {
  sumBranchAllocatedQuantity,
  validateBranchAllocationAgainstCentral,
} from '@/features/inventory/ledger';
import { logAuditAction } from '@/shared/audit/logger';
import { runWithCorrelationId } from '@/shared/security/async-context';
import { verifyVendorAccess } from '@/features/inventory/vendor-data';

export async function createBranchAction(data: { name: string; address?: string; phone?: string }) {
  return runWithCorrelationId(async () => {
    const { userId, orgId, premiumStatus } = await verifyVendorAccess();

    const existingCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.branches)
      .where(eq(schema.branches.orgId, orgId));
    
    const count = Number(existingCountResult[0].count);

    if (count > 0 && !premiumStatus.multiBranchActive) {
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
    await db.transaction(async (tx) => {
      const [branch] = await tx
        .select({ id: schema.branches.id })
        .from(schema.branches)
        .where(and(eq(schema.branches.id, parsed.data.branchId), eq(schema.branches.orgId, orgId)))
        .limit(1);

      if (!branch) {
        throw new Error('Branch not found or access denied.');
      }

      const [product] = await tx
        .select({ id: schema.products.id })
        .from(schema.products)
        .where(and(eq(schema.products.id, parsed.data.productId), eq(schema.products.orgId, orgId)))
        .limit(1);

      if (!product) {
        throw new Error('Product not found or access denied.');
      }

      const [centralInv] = await tx
        .select({ quantity: schema.inventory.quantity })
        .from(schema.inventory)
        .where(eq(schema.inventory.productId, parsed.data.productId))
        .for('update')
        .limit(1);

      if (!centralInv) {
        throw new Error('Central inventory record not found for this product.');
      }

      const otherBranchesAllocated = await sumBranchAllocatedQuantity(tx, parsed.data.productId, {
        excludeBranchId: parsed.data.branchId,
      });
      const allocationCheck = validateBranchAllocationAgainstCentral(
        centralInv.quantity,
        otherBranchesAllocated,
        parsed.data.quantity
      );
      if (!allocationCheck.ok) {
        throw new Error(allocationCheck.error);
      }

      const [existing] = await tx
        .select()
        .from(schema.branchInventory)
        .where(
          and(
            eq(schema.branchInventory.branchId, parsed.data.branchId),
            eq(schema.branchInventory.productId, parsed.data.productId)
          )
        )
        .for('update')
        .limit(1);

      if (existing) {
        await tx
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
        await tx.insert(schema.branchInventory).values({
          branchId: parsed.data.branchId,
          productId: parsed.data.productId,
          quantity: parsed.data.quantity,
          sku: parsed.data.sku || null,
          binLocation: parsed.data.binLocation || null,
        });
      }
    });

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
