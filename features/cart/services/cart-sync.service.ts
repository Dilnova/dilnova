import { db } from "@/shared/db/client";
import * as schema from "@/shared/db/schema";
import { inArray } from "drizzle-orm";

export async function syncCartPricesService(uniqueIds: string[]) {
  const rows = await db
    .select({
      id: schema.products.id,
      name: schema.products.name,
      price: schema.products.price,
      status: schema.products.status,
    })
    .from(schema.products)
    .where(inArray(schema.products.id, uniqueIds));

  const foundIds = new Set(rows.map((row) => row.id));
  const missingIds = uniqueIds.filter((id) => !foundIds.has(id));
  const inactiveIds = rows.filter((row) => row.status !== "active").map((row) => row.id);
  const activeRows = rows.filter((row) => row.status === "active");

  return {
    success: true as const,
    items: activeRows.map((row) => ({
      id: row.id,
      name: row.name,
      price: row.price,
    })),
    removedIds: [...missingIds, ...inactiveIds],
  };
}
