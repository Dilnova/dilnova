import { clerkClient } from "@clerk/nextjs/server";
import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "@/shared/db/client";
import * as schema from "@/shared/db/schema";
import { getRoleTestEmail, hasClerkApiKeys } from "./env";
import { loadE2EEnv } from "./load-env";
import { normalizeCustomerEmail } from "@/features/customer/email";
import { customerOwnsOrder } from "@/features/orders/customer-ownership";

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

  const customerEmail = getRoleTestEmail("customer") ?? null;
  const vendorAdminEmail = getRoleTestEmail("vendorAdmin") ?? null;

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
    (order) => !customerOwnsOrder(order, context.customerUserId),
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
    .where(ne(schema.products.orgId, ""))
    .limit(1);

  return product?.id ?? null;
}

/**
 * Seeds a deterministic in-stock product to guarantee checkout test execution.
 */
export async function seedPurchasableProduct(preferredOrgId?: string): Promise<string | null> {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  try {
    let orgId = preferredOrgId;
    if (!orgId) {
      const existingProduct = await db.query.products.findFirst({
        where: eq(schema.products.status, "active"),
      });
      orgId = existingProduct?.orgId || "e2e-seed-org";
    }

    const [product] = await db
      .insert(schema.products)
      .values({
        name: "E2E Purchasable Test Product",
        price: 1999,
        orgId,
        description: "Deterministic in-stock product for E2E checkout testing",
        status: "active",
        type: "product",
      })
      .returning({ id: schema.products.id });

    if (!product?.id) return null;

    // Seed inventory to guarantee In Stock availability
    await db
      .insert(schema.inventory)
      .values({
        productId: product.id,
        quantity: 50,
        stockAvailability: "in_stock",
      })
      .onConflictDoUpdate({
        target: schema.inventory.productId,
        set: {
          quantity: 50,
          stockAvailability: "in_stock",
        },
      });

    return product.id;
  } catch (error) {
    console.warn("[seedPurchasableProduct] Failed to seed purchasable product:", error);
    return null;
  }
}

/**
 * Ensures deterministic vendor POS state (Clerk IMS flags, branch, and in-stock product).
 */
export async function ensureVendorPosState(
  orgId: string,
): Promise<{ branchId: string | null; productId: string | null }> {
  // 1. Upgrade Clerk Org metadata to enable IMS and Billing Register
  if (hasClerkApiKeys()) {
    try {
      const client = await clerkClient();
      const org = await client.organizations.getOrganization({ organizationId: orgId });
      const meta = (org.publicMetadata || {}) as Record<string, unknown>;
      if (!meta.ims_enabled || !meta.ims_billing_enabled) {
        await client.organizations.updateOrganizationMetadata(orgId, {
          publicMetadata: {
            ...meta,
            ims_enabled: true,
            ims_billing_enabled: true,
            ims_multi_branch_enabled: true,
          },
        });
      }
    } catch (err) {
      console.warn("[ensureVendorPosState] Could not update Clerk org metadata:", err);
    }
  }

  // 2. Ensure DB branch and in-stock product exist
  let branchId: string | null = null;
  let productId: string | null = null;

  if (process.env.DATABASE_URL) {
    try {
      // Ensure branch exists
      const existingBranch = await db.query.branches.findFirst({
        where: eq(schema.branches.orgId, orgId),
      });
      if (existingBranch) {
        branchId = existingBranch.id;
      } else {
        const [branch] = await db
          .insert(schema.branches)
          .values({
            name: "Main Register",
            orgId,
            isDefault: true,
            address: "123 Commercial Road",
          })
          .returning({ id: schema.branches.id });
        branchId = branch?.id ?? null;
      }

      // Ensure active product exists
      const existingProduct = await db.query.products.findFirst({
        where: and(eq(schema.products.orgId, orgId), eq(schema.products.status, "active")),
      });
      if (existingProduct) {
        productId = existingProduct.id;
      } else {
        const [product] = await db
          .insert(schema.products)
          .values({
            name: "E2E POS Register Product",
            price: 1500,
            orgId,
            status: "active",
            type: "product",
          })
          .returning({ id: schema.products.id });
        productId = product?.id ?? null;
      }

      // Ensure positive inventory
      if (productId) {
        const existingInv = await db.query.inventory.findFirst({
          where: eq(schema.inventory.productId, productId),
        });
        if (!existingInv) {
          await db.insert(schema.inventory).values({
            productId,
            quantity: 50,
            stockAvailability: "in_stock",
          });
        } else if (existingInv.quantity <= 0 || existingInv.stockAvailability !== "in_stock") {
          await db
            .update(schema.inventory)
            .set({ quantity: 50, stockAvailability: "in_stock" })
            .where(eq(schema.inventory.id, existingInv.id));
        }
      }
    } catch (err) {
      console.warn("[ensureVendorPosState] DB seeding error:", err);
    }
  }

  return { branchId, productId };
}
