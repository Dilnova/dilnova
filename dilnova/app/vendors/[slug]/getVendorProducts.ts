import { db } from '../../../db';
import * as schema from '../../../db/schema';
import { eq, and } from 'drizzle-orm';
import type { VendorProduct } from './custom/types';
import { unstable_cache } from 'next/cache';

/**
 * Fetch all products belonging to a specific vendor organization (cached).
 */
export async function getVendorProducts(orgId: string): Promise<VendorProduct[]> {
  const fetchProducts = unstable_cache(
    async (id: string) => {
      console.log(`[Database Cache] Cache miss, querying database products for org: ${id}...`);
      const results = await db
        .select({
          id: schema.products.id,
          name: schema.products.name,
          type: schema.products.type,
          description: schema.products.description,
          price: schema.products.price,
          imageUrl: schema.products.imageUrl,
          categoryName: schema.categories.name,
          categorySlug: schema.categories.slug,
        })
        .from(schema.products)
        .leftJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
        .where(and(eq(schema.products.orgId, id), eq(schema.products.status, 'active')));

      return results;
    },
    [`vendor-products-${orgId}`],
    {
      revalidate: 30, // Cache for 30 seconds
      tags: [`vendor-products-${orgId}`]
    }
  );

  return fetchProducts(orgId);
}
