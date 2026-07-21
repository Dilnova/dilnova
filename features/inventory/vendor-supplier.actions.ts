'use server';

import { db } from '@/shared/db/client';
import * as schema from '@/shared/db/schema';
import { eq, and } from 'drizzle-orm';
import { revalidateVendorConsole } from '@/features/vendor/revalidate';
import {
  createSupplierSchema,
  updateSupplierSchema,
  deleteSupplierSchema,
} from '@/features/inventory/schema';
import { logAuditAction } from '@/shared/audit/logger';
import { runWithCorrelationId } from '@/shared/security/async-context';
import { rateLimit } from '@/shared/security/rate-limit';
import { verifyVendorAccess } from '@/features/inventory/vendor-data';

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
