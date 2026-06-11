import * as schema from '@/db/schema';
import { eq, and, ne, sql } from 'drizzle-orm';
import type { db } from '@/db';

type DbConn = Parameters<Parameters<typeof db.transaction>[0]>[0] | typeof db;

/** Sum of quantities allocated across all (or other) branches for a product. */
export async function sumBranchAllocatedQuantity(
  conn: DbConn,
  productId: string,
  options?: { excludeBranchId?: string }
): Promise<number> {
  const conditions = [eq(schema.branchInventory.productId, productId)];
  if (options?.excludeBranchId) {
    conditions.push(ne(schema.branchInventory.branchId, options.excludeBranchId));
  }

  const [row] = await conn
    .select({
      total: sql<number>`coalesce(sum(${schema.branchInventory.quantity}), 0)::int`,
    })
    .from(schema.branchInventory)
    .where(and(...conditions));

  return row?.total ?? 0;
}

export function validateBranchAllocationAgainstCentral(
  centralQuantity: number,
  otherBranchesAllocated: number,
  requestedBranchQuantity: number
): { ok: true } | { ok: false; error: string } {
  const maxAllowed = centralQuantity - otherBranchesAllocated;
  if (requestedBranchQuantity > maxAllowed) {
    return {
      ok: false,
      error: `Cannot allocate ${requestedBranchQuantity} units. Only ${Math.max(0, maxAllowed)} unallocated units are available at central warehouse.`,
    };
  }
  return { ok: true };
}

export function validateCentralQuantityCoversBranches(
  centralQuantity: number,
  totalBranchAllocated: number
): { ok: true } | { ok: false; error: string } {
  if (centralQuantity < totalBranchAllocated) {
    return {
      ok: false,
      error: `Central stock (${centralQuantity}) cannot be below total branch allocation (${totalBranchAllocated}). Reduce branch allocations first.`,
    };
  }
  return { ok: true };
}

export async function getOrgDefaultBranchId(
  conn: DbConn,
  orgId: string
): Promise<string | null> {
  const branches = await conn
    .select({ id: schema.branches.id, isDefault: schema.branches.isDefault })
    .from(schema.branches)
    .where(eq(schema.branches.orgId, orgId));

  const defaultBranch = branches.find((b) => b.isDefault) || branches[0];
  return defaultBranch?.id ?? null;
}

/** Increase default branch allocation when central stock is restocked (multi-branch POS sync). */
export async function incrementDefaultBranchStock(
  conn: DbConn,
  orgId: string,
  productId: string,
  quantityDelta: number
): Promise<void> {
  if (quantityDelta <= 0) return;

  const branchId = await getOrgDefaultBranchId(conn, orgId);
  if (!branchId) return;

  const [existing] = await conn
    .select({
      id: schema.branchInventory.id,
      quantity: schema.branchInventory.quantity,
    })
    .from(schema.branchInventory)
    .where(
      and(
        eq(schema.branchInventory.branchId, branchId),
        eq(schema.branchInventory.productId, productId)
      )
    )
    .limit(1);

  if (existing) {
    await conn
      .update(schema.branchInventory)
      .set({
        quantity: existing.quantity + quantityDelta,
        updatedAt: new Date(),
      })
      .where(eq(schema.branchInventory.id, existing.id));
  } else {
    await conn.insert(schema.branchInventory).values({
      branchId,
      productId,
      quantity: quantityDelta,
    });
  }
}
