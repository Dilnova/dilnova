import { db } from "@/shared/db/client";
import * as schema from "@/shared/db/schema";
import { inArray, eq } from "drizzle-orm";

export async function syncCartPricesService(uniqueIds: string[]) {
  if (uniqueIds.length === 0) {
    return { success: true as const, items: [], removedIds: [] };
  }

  const rows = await db
    .select({
      id: schema.products.id,
      name: schema.products.name,
      price: schema.products.price,
      status: schema.products.status,
      weightGrams: schema.products.weightGrams,
      stockQuantity: schema.inventory.quantity,
      stockStatus: schema.inventory.stockAvailability,
    })
    .from(schema.products)
    .leftJoin(schema.inventory, eq(schema.products.id, schema.inventory.productId))
    .where(inArray(schema.products.id, uniqueIds));

  const foundIds = new Set(rows.map((row) => row.id));
  const missingIds = uniqueIds.filter((id) => !foundIds.has(id));
  const inactiveIds = rows
    .filter((row) => row.status !== "active" || row.stockStatus === "out_of_stock")
    .map((row) => row.id);
  const activeRows = rows.filter(
    (row) => row.status === "active" && row.stockStatus !== "out_of_stock",
  );

  return {
    success: true as const,
    items: activeRows.map((row) => ({
      id: row.id,
      name: row.name,
      price: row.price,
      weightGrams: row.weightGrams,
      stockQuantity: row.stockQuantity ?? null,
      stockStatus: row.stockStatus ?? "in_stock",
    })),
    removedIds: [...missingIds, ...inactiveIds],
  };
}
