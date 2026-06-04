import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import SuperAdminClient from './SuperAdminClient';
import { getSystemSetting } from '@/utils/settings';

export const revalidate = 0; // Fresh database query on each load

export default async function SuperAdminDashboardPage() {
  // 1. Fetch Categories
  const categories = await db
    .select()
    .from(schema.categories)
    .orderBy(desc(schema.categories.createdAt));

  // 2. Fetch Products with joined Category details
  const rawProducts = await db
    .select({
      product: schema.products,
      category: schema.categories,
    })
    .from(schema.products)
    .leftJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
    .orderBy(desc(schema.products.createdAt));

  const products = rawProducts.map((row) => ({
    ...row.product,
    categoryName: row.category?.name || null,
  }));

  // 3. Compute stats
  const totalProductsCount = products.filter((p) => p.type === 'product').length;
  const totalServicesCount = products.filter((p) => p.type === 'service').length;
  const totalCategoriesCount = categories.length;
  const totalViewsCount = products.reduce((acc, p) => acc + (p.views || 0), 0);

  const stats = {
    totalProducts: totalProductsCount,
    totalServices: totalServicesCount,
    totalCategories: totalCategoriesCount,
    totalViews: totalViewsCount,
  };

  const maxMediaLimitSetting = await getSystemSetting('max_media_limit', '5');
  const maxMediaLimit = parseInt(maxMediaLimitSetting, 10) || 5;

  const systemLogo = await getSystemSetting('system_logo', '');
  const systemFavicon = await getSystemSetting('system_favicon', '');

  // 4. Fetch Pricing Plans
  const pricingPlans = await db
    .select()
    .from(schema.pricingPlans)
    .orderBy(desc(schema.pricingPlans.createdAt));

  // 5. Fetch Contact Submissions
  const contactSubmissions = await db
    .select()
    .from(schema.contactSubmissions)
    .orderBy(desc(schema.contactSubmissions.createdAt));

  return (
    <main className="px-3 py-4 sm:px-6 md:px-10 lg:px-12 sm:py-8 max-w-[1400px] mx-auto font-sans w-full">
      <SuperAdminClient
        categories={categories}
        products={products}
        stats={stats}
        maxMediaLimit={maxMediaLimit}
        systemLogo={systemLogo}
        systemFavicon={systemFavicon}
        pricingPlans={pricingPlans}
        contactSubmissions={contactSubmissions}
      />
    </main>
  );
}
