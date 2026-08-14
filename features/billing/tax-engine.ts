import { db } from "@/shared/db/client";
import * as schema from "@/shared/db/schema";
import { eq, inArray } from "drizzle-orm";

// ── Types ─────────────────────────────────────────────────────

export interface ResolvedTaxClass {
  id: string;
  code: string;
  name: string;
  ratePercent: number; // e.g. 8.0 → 8%
}

export interface LineTaxResult {
  lineSubtotalCents: number;
  taxAmountCents: number;
  taxRatePercent: number;
  taxClassCode: string;
  taxClassName: string;
}

export interface TaxLineByClass {
  code: string;
  name: string;
  ratePercent: number;
  taxAmountCents: number;
  subtotalCents: number;
}

export interface CartTaxBreakdown {
  lines: Array<{ productId: string } & LineTaxResult>;
  totalTaxCents: number;
  /** Dominant tax class for display (used on invoice label) */
  primaryTaxClass: Pick<ResolvedTaxClass, "code" | "name" | "ratePercent"> | null;
  taxLinesByClass: TaxLineByClass[];
  productTaxMap: Record<
    string,
    Pick<ResolvedTaxClass, "code" | "name" | "ratePercent"> & { taxAmountCents: number }
  >;
}

export type DbOrTransaction = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

// ── Constants ─────────────────────────────────────────────────

/** Used when no tax class can be resolved — safe: charges 0% rather than wrong rate */
export const ZERO_TAX_CLASS: ResolvedTaxClass = {
  id: "zero-fallback",
  code: "ZERO",
  name: "No Tax",
  ratePercent: 0,
};

// ── Resolution ────────────────────────────────────────────────

/**
 * Resolve the effective tax class for a product.
 * Priority: product.taxClassId → category.taxClassId → org default → STANDARD code → ZERO
 */
export async function resolveTaxClassForProduct(
  productId: string,
  orgId?: string,
  txOrDb: DbOrTransaction = db,
): Promise<ResolvedTaxClass> {
  // Fetch product (taxClassId, orgId) and category (taxClassId) in one query
  const [row] = await txOrDb
    .select({
      productTaxClassId: schema.products.taxClassId,
      productOrgId: schema.products.orgId,
      categoryTaxClassId: schema.categories.taxClassId,
    })
    .from(schema.products)
    .leftJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
    .where(eq(schema.products.id, productId))
    .limit(1);

  // Level 1: Product Direct Tax Override
  if (row?.productTaxClassId) {
    const [tc] = await txOrDb
      .select({
        id: schema.taxClasses.id,
        code: schema.taxClasses.code,
        name: schema.taxClasses.name,
        ratePercent: schema.taxClasses.ratePercent,
      })
      .from(schema.taxClasses)
      .where(eq(schema.taxClasses.id, row.productTaxClassId))
      .limit(1);
    if (tc) return tc;
  }

  // Level 2: Category Tax Override
  if (row?.categoryTaxClassId) {
    const [tc] = await txOrDb
      .select({
        id: schema.taxClasses.id,
        code: schema.taxClasses.code,
        name: schema.taxClasses.name,
        ratePercent: schema.taxClasses.ratePercent,
      })
      .from(schema.taxClasses)
      .where(eq(schema.taxClasses.id, row.categoryTaxClassId))
      .limit(1);
    if (tc) return tc;
  }

  // Level 3: Org Default Tax
  const effectiveOrgId = orgId || row?.productOrgId;
  if (effectiveOrgId) {
    const [orgRow] = await txOrDb
      .select({ defaultTaxClassId: schema.orgSettings.defaultTaxClassId })
      .from(schema.orgSettings)
      .where(eq(schema.orgSettings.orgId, effectiveOrgId))
      .limit(1);

    if (orgRow?.defaultTaxClassId) {
      const [tc] = await txOrDb
        .select({
          id: schema.taxClasses.id,
          code: schema.taxClasses.code,
          name: schema.taxClasses.name,
          ratePercent: schema.taxClasses.ratePercent,
        })
        .from(schema.taxClasses)
        .where(eq(schema.taxClasses.id, orgRow.defaultTaxClassId))
        .limit(1);
      if (tc) return tc;
    }
  }

  // Level 4: Default Fallback (0% Tax)
  return ZERO_TAX_CLASS;
}

/**
 * Efficiently batch-resolves tax classes for multiple products in 3 bulk queries maximum (0 N+1 queries!).
 */
export async function batchResolveTaxClassesForProducts(
  productIds: string[],
  txOrDb: DbOrTransaction = db,
): Promise<Map<string, ResolvedTaxClass>> {
  const resultMap = new Map<string, ResolvedTaxClass>();
  if (!productIds || productIds.length === 0) return resultMap;

  const uniqueProductIds = [...new Set(productIds.filter(Boolean))];
  if (uniqueProductIds.length === 0) return resultMap;

  // 1. Bulk query: Fetch product taxClassId, orgId, and category taxClassId
  const productRows = await txOrDb
    .select({
      productId: schema.products.id,
      productOrgId: schema.products.orgId,
      productTaxClassId: schema.products.taxClassId,
      categoryTaxClassId: schema.categories.taxClassId,
    })
    .from(schema.products)
    .leftJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
    .where(inArray(schema.products.id, uniqueProductIds));

  const taxClassIds = new Set<string>();
  const orgIds = new Set<string>();

  for (const row of productRows) {
    if (row.productTaxClassId) taxClassIds.add(row.productTaxClassId);
    if (row.categoryTaxClassId) taxClassIds.add(row.categoryTaxClassId);
    if (row.productOrgId) orgIds.add(row.productOrgId);
  }

  // 2. Bulk query: Fetch default taxClassId for all involved orgs
  const orgDefaultsMap = new Map<string, string>();
  if (orgIds.size > 0) {
    const orgSettingsRows = await txOrDb
      .select({
        orgId: schema.orgSettings.orgId,
        defaultTaxClassId: schema.orgSettings.defaultTaxClassId,
      })
      .from(schema.orgSettings)
      .where(inArray(schema.orgSettings.orgId, [...orgIds]));

    for (const orgRow of orgSettingsRows) {
      if (orgRow.defaultTaxClassId) {
        orgDefaultsMap.set(orgRow.orgId, orgRow.defaultTaxClassId);
        taxClassIds.add(orgRow.defaultTaxClassId);
      }
    }
  }

  // 3. Bulk query: Fetch details for all required tax class IDs
  const taxClassesMap = new Map<string, ResolvedTaxClass>();
  if (taxClassIds.size > 0) {
    const taxClassRows = await txOrDb
      .select({
        id: schema.taxClasses.id,
        code: schema.taxClasses.code,
        name: schema.taxClasses.name,
        ratePercent: schema.taxClasses.ratePercent,
      })
      .from(schema.taxClasses)
      .where(inArray(schema.taxClasses.id, [...taxClassIds]));

    for (const tc of taxClassRows) {
      taxClassesMap.set(tc.id, tc);
    }
  }

  // Resolve hierarchy for each product
  for (const row of productRows) {
    let resolved: ResolvedTaxClass | null = null;

    if (row.productTaxClassId && taxClassesMap.has(row.productTaxClassId)) {
      resolved = taxClassesMap.get(row.productTaxClassId)!;
    } else if (row.categoryTaxClassId && taxClassesMap.has(row.categoryTaxClassId)) {
      resolved = taxClassesMap.get(row.categoryTaxClassId)!;
    } else if (row.productOrgId && orgDefaultsMap.has(row.productOrgId)) {
      const defaultTcId = orgDefaultsMap.get(row.productOrgId)!;
      if (taxClassesMap.has(defaultTcId)) {
        resolved = taxClassesMap.get(defaultTcId)!;
      }
    }

    resultMap.set(row.productId, resolved || ZERO_TAX_CLASS);
  }

  return resultMap;
}

// ── Per-line calc ─────────────────────────────────────────────

export function calculateLineTax(
  unitPriceCents: number,
  quantity: number,
  taxClass: ResolvedTaxClass,
): LineTaxResult {
  const lineSubtotalCents = Math.max(0, unitPriceCents * quantity);
  const taxAmountCents = Math.round(lineSubtotalCents * (taxClass.ratePercent / 100));
  return {
    lineSubtotalCents,
    taxAmountCents,
    taxRatePercent: taxClass.ratePercent,
    taxClassCode: taxClass.code,
    taxClassName: taxClass.name,
  };
}

// ── Cart-level breakdown ──────────────────────────────────────

/**
 * Resolves tax for each item in a cart and returns a full breakdown.
 * Uses batch resolving to prevent N+1 queries.
 */
export async function buildCartTaxBreakdown(
  items: Array<{
    productId: string;
    unitPriceCents: number;
    quantity: number;
    vendorOrgId?: string;
  }>,
  defaultOrgId: string = "",
  txOrDb: DbOrTransaction = db,
): Promise<CartTaxBreakdown> {
  const lines: CartTaxBreakdown["lines"] = [];
  let totalTaxCents = 0;
  const classFrequency = new Map<
    string,
    { tc: ResolvedTaxClass; subtotal: number; taxCents: number }
  >();
  const productTaxMap: CartTaxBreakdown["productTaxMap"] = {};

  // Batch resolve all product tax classes in bulk (0 N+1 queries!)
  const productIds = items.map((item) => item.productId);
  const taxClassMap = await batchResolveTaxClassesForProducts(productIds, txOrDb);

  for (const item of items) {
    const tc = taxClassMap.get(item.productId) || (defaultOrgId ? ZERO_TAX_CLASS : ZERO_TAX_CLASS);
    const line = calculateLineTax(item.unitPriceCents, item.quantity, tc);
    lines.push({ productId: item.productId, ...line });
    totalTaxCents += line.taxAmountCents;
    productTaxMap[item.productId] = {
      code: tc.code,
      name: tc.name,
      ratePercent: tc.ratePercent,
      taxAmountCents: line.taxAmountCents,
    };

    const existing = classFrequency.get(tc.code);
    classFrequency.set(tc.code, {
      tc,
      subtotal: (existing?.subtotal ?? 0) + line.lineSubtotalCents,
      taxCents: (existing?.taxCents ?? 0) + line.taxAmountCents,
    });
  }

  // Primary = class with highest subtotal contribution
  let primaryTaxClass: CartTaxBreakdown["primaryTaxClass"] = null;
  let maxSubtotal = -1;
  const taxLinesByClass: TaxLineByClass[] = [];

  for (const { tc, subtotal, taxCents } of classFrequency.values()) {
    taxLinesByClass.push({
      code: tc.code,
      name: tc.name,
      ratePercent: tc.ratePercent,
      taxAmountCents: taxCents,
      subtotalCents: subtotal,
    });
    if (subtotal > maxSubtotal) {
      maxSubtotal = subtotal;
      primaryTaxClass = { code: tc.code, name: tc.name, ratePercent: tc.ratePercent };
    }
  }

  return { lines, totalTaxCents, primaryTaxClass, taxLinesByClass, productTaxMap };
}
