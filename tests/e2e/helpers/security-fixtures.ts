import { clerkClient } from '@clerk/nextjs/server';
import { ne, sql } from 'drizzle-orm';
import { db } from '@/shared/db/client';
import * as schema from '@/shared/db/schema';
import { getRoleTestEmail, hasClerkApiKeys } from './env';
import { loadE2EEnv } from './load-env';
import { normalizeCustomerEmail } from '@/features/customer/email';
import { customerOwnsOrder } from '@/features/orders/customer-ownership';

export interface SecurityFixtures {
  /** Order owned by a different customer than the E2E customer account. */
  foreignCustomerOrderId: string;
  /** Product owned by a different vendor org than the E2E vendor admin org. */
  foreignVendorProductId: string;
  /** Order that does not include items from the E2E vendor admin org. */
  foreignVendorOrderId: string;
}

export interface SecurityFixtureContext {
  customerUserId: string | null;
  customerEmail: string | null;
  vendorOrgId: string | null;
}

async function getClerkUserIdByEmail(email: string): Promise<string | null> {
  const client = await clerkClient();
  const users = await client.users.getUserList({ emailAddress: [email] });
  return users.data[0]?.id ?? null;
}

async function getPrimaryOrgIdForUser(userId: string): Promise<string | null> {
  const client = await clerkClient();
  const memberships = await client.users.getOrganizationMembershipList({ userId });
  return memberships.data[0]?.organization.id ?? null;
}

export async function loadSecurityFixtureContext(): Promise<SecurityFixtureContext | null> {
  loadE2EEnv();

  if (!process.env.DATABASE_URL || !hasClerkApiKeys()) {
    return null;
  }

  const customerEmail = getRoleTestEmail('customer') ?? null;
  const vendorAdminEmail = getRoleTestEmail('vendorAdmin') ?? null;

  const [customerUserId, vendorAdminUserId] = await Promise.all([
    customerEmail ? getClerkUserIdByEmail(customerEmail) : Promise.resolve(null),
    vendorAdminEmail ? getClerkUserIdByEmail(vendorAdminEmail) : Promise.resolve(null),
  ]);

  const vendorOrgId = vendorAdminUserId ? await getPrimaryOrgIdForUser(vendorAdminUserId) : null;

  return {
    customerUserId,
    customerEmail: customerEmail ? normalizeCustomerEmail(customerEmail) : null,
    vendorOrgId,
  };
}

export async function loadSecurityFixtures(
  context: SecurityFixtureContext,
): Promise<SecurityFixtures | null> {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  const orders = await db
    .select({
      id: schema.simulatedOrders.id,
      customerUserId: schema.simulatedOrders.customerUserId,
      customerEmail: schema.simulatedOrders.customerEmail,
    })
    .from(schema.simulatedOrders)
    .orderBy(sql`${schema.simulatedOrders.createdAt} desc`)
    .limit(50);

  const foreignCustomerOrder = orders.find(
    (order) => !customerOwnsOrder(order, context.customerUserId)
  );

  const products = await db
    .select({
      id: schema.products.id,
      orgId: schema.products.orgId,
    })
    .from(schema.products)
    .limit(100);

  const foreignProduct = context.vendorOrgId
    ? products.find((product) => product.orgId !== context.vendorOrgId)
    : products[0];

  let foreignVendorOrderId: string | null = null;
  if (context.vendorOrgId) {
    const orderItems = await db
      .select({
        orderId: schema.simulatedOrderItems.orderId,
        vendorOrgId: schema.simulatedOrderItems.vendorOrgId,
      })
      .from(schema.simulatedOrderItems)
      .limit(200);

    const orderVendorMap = new Map<string, Set<string>>();
    for (const row of orderItems) {
      const set = orderVendorMap.get(row.orderId) ?? new Set<string>();
      set.add(row.vendorOrgId);
      orderVendorMap.set(row.orderId, set);
    }

    for (const [orderId, vendorOrgIds] of orderVendorMap) {
      if (!vendorOrgIds.has(context.vendorOrgId)) {
        foreignVendorOrderId = orderId;
        break;
      }
    }
  }

  if (!foreignCustomerOrder || !foreignProduct || !foreignVendorOrderId) {
    return null;
  }

  return {
    foreignCustomerOrderId: foreignCustomerOrder.id,
    foreignVendorProductId: foreignProduct.id,
    foreignVendorOrderId,
  };
}

export async function loadAnyProductId(): Promise<string | null> {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  const [product] = await db
    .select({ id: schema.products.id })
    .from(schema.products)
    .where(ne(schema.products.orgId, ''))
    .limit(1);

  return product?.id ?? null;
}
