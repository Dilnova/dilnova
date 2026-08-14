"use server";

import { db } from "@/shared/db/client";
import * as schema from "@/shared/db/schema";
import { inArray, eq } from "drizzle-orm";
import { z } from "zod/v3";
import { actionClient } from "@/lib/safe-action";

const validateStockInputSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      quantity: z.number().int().positive(),
      vendorOrgId: z.string().optional(),
    }),
  ),
  pickupBranchId: z.string().uuid().optional().nullable(),
});

export interface CartStockValidationItem {
  productId: string;
  requestedQuantity: number;
  availableStock: number;
  centralStock: number;
  branchStock: number | null;
  branchName: string | null;
  isStockValid: boolean;
  errorMessage: string | null;
}

export interface CartStockValidationResult {
  hasStockErrors: boolean;
  itemsMap: Record<string, CartStockValidationItem>;
  errorSummary: string[];
}

export const validateCartStockAction = actionClient
  .schema(validateStockInputSchema)
  .action(async ({ parsedInput }) => {
    const { items, pickupBranchId } = parsedInput;

    if (items.length === 0) {
      return {
        hasStockErrors: false,
        itemsMap: {},
        errorSummary: [],
      };
    }

    const uniqueProductIds = [...new Set(items.map((i) => i.id))];

    // Query products & central inventory
    const productRows = await db
      .select({
        id: schema.products.id,
        name: schema.products.name,
        type: schema.products.type,
        status: schema.products.status,
        orgId: schema.products.orgId,
        centralQuantity: schema.inventory.quantity,
        stockAvailability: schema.inventory.stockAvailability,
      })
      .from(schema.products)
      .leftJoin(schema.inventory, eq(schema.products.id, schema.inventory.productId))
      .where(inArray(schema.products.id, uniqueProductIds));

    const productMap = new Map(productRows.map((p) => [p.id, p]));

    // Query branch inventory
    const branchRows = await db
      .select({
        productId: schema.branchInventory.productId,
        branchId: schema.branchInventory.branchId,
        branchQuantity: schema.branchInventory.quantity,
        branchName: schema.branches.name,
        isDefault: schema.branches.isDefault,
      })
      .from(schema.branchInventory)
      .innerJoin(schema.branches, eq(schema.branchInventory.branchId, schema.branches.id))
      .where(inArray(schema.branchInventory.productId, uniqueProductIds));

    // Group branch rows by productId
    const branchMap = new Map<string, typeof branchRows>();
    for (const row of branchRows) {
      const existing = branchMap.get(row.productId) || [];
      existing.push(row);
      branchMap.set(row.productId, existing);
    }

    let hasStockErrors = false;
    const itemsMap: Record<string, CartStockValidationItem> = {};
    const errorSummary: string[] = [];

    for (const item of items) {
      const product = productMap.get(item.id);

      if (!product) {
        hasStockErrors = true;
        const msg = `Product not found in store catalog.`;
        errorSummary.push(msg);
        itemsMap[item.id] = {
          productId: item.id,
          requestedQuantity: item.quantity,
          availableStock: 0,
          centralStock: 0,
          branchStock: 0,
          branchName: null,
          isStockValid: false,
          errorMessage: msg,
        };
        continue;
      }

      // Services skip physical stock checks
      if (product.type === "service") {
        itemsMap[item.id] = {
          productId: item.id,
          requestedQuantity: item.quantity,
          availableStock: 9999,
          centralStock: 9999,
          branchStock: null,
          branchName: null,
          isStockValid: true,
          errorMessage: null,
        };
        continue;
      }

      const centralStock = product.centralQuantity ?? 0;
      const stockStatus = product.stockAvailability ?? "in_stock";
      const productBranchRows = branchMap.get(item.id) || [];

      // Determine branch allocation stock if applicable
      let resolvedBranchStock: number | null = null;
      let resolvedBranchName: string | null = null;

      if (pickupBranchId) {
        const bMatch = productBranchRows.find((b) => b.branchId === pickupBranchId);
        if (bMatch) {
          resolvedBranchStock = bMatch.branchQuantity;
          resolvedBranchName = bMatch.branchName;
        }
      }

      const effectiveAvailable =
        resolvedBranchStock !== null ? Math.min(centralStock, resolvedBranchStock) : centralStock;

      let isStockValid = true;
      let errorMessage: string | null = null;

      if (product.status !== "active" || stockStatus === "out_of_stock") {
        isStockValid = false;
        errorMessage = `Item is currently out of stock.`;
      } else if (effectiveAvailable < item.quantity || effectiveAvailable <= 0) {
        isStockValid = false;
        if (resolvedBranchStock !== null && resolvedBranchStock < item.quantity) {
          errorMessage = `Only ${resolvedBranchStock} units available at ${resolvedBranchName || "branch"}.`;
        } else {
          errorMessage = `Only ${centralStock} units available in stock.`;
        }
      }

      if (!isStockValid) {
        hasStockErrors = true;
        if (errorMessage) {
          errorSummary.push(`"${product.name}": ${errorMessage}`);
        }
      }

      itemsMap[item.id] = {
        productId: item.id,
        requestedQuantity: item.quantity,
        availableStock: Math.max(0, effectiveAvailable),
        centralStock,
        branchStock: resolvedBranchStock,
        branchName: resolvedBranchName,
        isStockValid,
        errorMessage,
      };
    }

    return {
      hasStockErrors,
      itemsMap,
      errorSummary,
    };
  });
