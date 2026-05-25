import { db } from '../../../db';
import * as schema from '../../../db/schema';
import { eq } from 'drizzle-orm';
import type { VendorProduct } from './custom/types';

/**
 * Fetch all products belonging to a specific vendor organization.
 * Returns products joined with their category names.
 */
export async function getVendorProducts(orgId: string): Promise<VendorProduct[]> {
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
    .where(eq(schema.products.orgId, orgId));

  return results;
}
