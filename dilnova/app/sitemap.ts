import { MetadataRoute } from 'next';
import { db } from '@/db';
import { products, categories } from '@/db/schema';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dilnova.com';

  let productEntries: MetadataRoute.Sitemap = [];
  let categoryEntries: MetadataRoute.Sitemap = [];

  try {
    // Retrieve all active products
    const dbProducts = await db
      .select({
        id: products.id,
        updatedAt: products.updatedAt,
      })
      .from(products);

    productEntries = dbProducts.map((p) => ({
      url: `${baseUrl}/products/${p.id}`,
      lastModified: p.updatedAt || new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    }));
  } catch (error) {
    console.error('Sitemap: Failed to load products for sitemap', error);
  }

  try {
    // Retrieve all categories
    const dbCategories = await db
      .select({
        slug: categories.slug,
        createdAt: categories.createdAt,
      })
      .from(categories);

    categoryEntries = dbCategories.map((c) => ({
      url: `${baseUrl}/products?category=${c.slug}`,
      lastModified: c.createdAt || new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));
  } catch (error) {
    console.error('Sitemap: Failed to load categories for sitemap', error);
  }

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    {
      url: `${baseUrl}/products`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
    ...categoryEntries,
    ...productEntries,
  ];
}
