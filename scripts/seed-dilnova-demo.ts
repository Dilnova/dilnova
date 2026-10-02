import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import { sql, eq } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "../shared/db/schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ DATABASE_URL is missing in .env.local");
  process.exit(1);
}

const client = postgres(connectionString, { prepare: false });
const db = drizzle(client, { schema });

/**
 * Dilnova Commerce Hub — Sample Vendor & Product Seeder
 *
 * Usage:
 *   pnpm exec tsx scripts/seed-dilnova-demo.ts [CLERK_ORG_ID]
 *
 * Example:
 *   pnpm exec tsx scripts/seed-dilnova-demo.ts org_2abc12345
 */
async function main() {
  const targetOrgId = process.argv[2] || "org_dilnova_demo";

  console.log(`\n======================================================`);
  console.log(`🚀 Dilnova Demo Seeder: Seeding for Org: "${targetOrgId}"`);
  console.log(`======================================================\n`);

  // 1. Resolve or Create Default Branch for the Org
  console.log("📍 Ensuring default branch exists for this organization...");
  let [defaultBranch] = await db
    .select()
    .from(schema.branches)
    .where(eq(schema.branches.orgId, targetOrgId))
    .limit(1);

  if (!defaultBranch) {
    console.log("   Creating main branch: 'Dilnova Flagship Store'...");
    const [newBranch] = await db
      .insert(schema.branches)
      .values({
        orgId: targetOrgId,
        name: "Dilnova Flagship Store",
        isDefault: true,
      })
      .returning();
    defaultBranch = newBranch;
  }
  console.log(`   ✓ Active Branch: ${defaultBranch.name} (${defaultBranch.id})`);

  // 2. Resolve Tax Classes
  const taxClasses = await db.select().from(schema.taxClasses).limit(1);
  const defaultTax = taxClasses[0] || null;

  // 3. Resolve or Create Product Categories
  console.log("\n📦 Ensuring product categories exist...");
  async function getOrCreateCategory(slug: string, name: string) {
    const existing = await db
      .select()
      .from(schema.categories)
      .where(eq(schema.categories.slug, slug))
      .limit(1);
    if (existing.length > 0) return existing[0];

    const [created] = await db.insert(schema.categories).values({ name, slug }).returning();
    return created;
  }

  const techCategory = await getOrCreateCategory("electronics-tech", "Electronics & Tech");
  const lifestyleCategory = await getOrCreateCategory("lifestyle-gear", "Lifestyle & Accessories");
  const homeCategory = await getOrCreateCategory("home-office", "Home & Office");

  // 4. Sample Products for Dilnova Demo Flow
  const sampleProducts = [
    {
      name: "Dilnova Pulse Wireless ANC Headphones",
      description:
        "Premium active noise-cancelling over-ear headphones with 40-hour battery life, high-resolution audio codecs, and plush memory foam earcups.",
      price: 24900, // 24,900 LKR or minor units
      currency: "LKR",
      imageUrl:
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80",
      categoryId: techCategory.id,
      sku: "DN-PULSE-01",
      stock: 35,
      lowStockThreshold: 5,
      binLocation: "A-01",
      weightGrams: 420,
    },
    {
      name: "Dilnova Lumos Smart Ergonomic Desk Lamp",
      description:
        "Minimalist aluminum desk lamp with touch brightness dimmer, auto-adjusting color temperature (2700K - 6500K), and built-in 15W Qi wireless charging base.",
      price: 14500,
      currency: "LKR",
      imageUrl:
        "https://images.unsplash.com/photo-1534073828943-f801091bb18c?w=800&auto=format&fit=crop&q=80",
      categoryId: homeCategory.id,
      sku: "DN-LUMOS-02",
      stock: 18,
      lowStockThreshold: 4,
      binLocation: "B-03",
      weightGrams: 850,
    },
    {
      name: "Dilnova Voyager Waterproof Commuter Backpack",
      description:
        "Weatherproof 24L urban backpack crafted from ballistic recycled nylon. Features dedicated 16-inch laptop sleeve, magnetic Fidlock buckles, and hidden passport pocket.",
      price: 18500,
      currency: "LKR",
      imageUrl:
        "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80",
      categoryId: lifestyleCategory.id,
      sku: "DN-VOYAGER-03",
      stock: 22,
      lowStockThreshold: 6,
      binLocation: "C-12",
      weightGrams: 750,
    },
    {
      name: "Dilnova TurboGaN 65W Fast Charger (3-Port)",
      description:
        "Ultra-compact GaN III wall charger with dual USB-C Power Delivery ports and one USB-A QuickCharge port. Charges laptops, tablets, and phones simultaneously.",
      price: 6800,
      currency: "LKR",
      imageUrl:
        "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&auto=format&fit=crop&q=80",
      categoryId: techCategory.id,
      sku: "DN-GAN-04",
      stock: 50,
      lowStockThreshold: 10,
      binLocation: "D-05",
      weightGrams: 180,
    },
  ];

  console.log(`\n🛒 Inserting sample products for "${targetOrgId}"...`);

  for (const item of sampleProducts) {
    // Check if product with same SKU exists for this org
    const existing = await db
      .select()
      .from(schema.products)
      .where(
        sql`${schema.products.orgId} = ${targetOrgId} AND ${schema.products.sku} = ${item.sku}`,
      )
      .limit(1);

    let productId = existing[0]?.id;

    if (!productId) {
      const [inserted] = await db
        .insert(schema.products)
        .values({
          name: item.name,
          type: "product",
          description: item.description,
          price: item.price,
          currency: item.currency,
          imageUrl: item.imageUrl,
          orgId: targetOrgId,
          categoryId: item.categoryId,
          taxClassId: defaultTax ? defaultTax.id : null,
          sku: item.sku,
          barcodes: [item.sku],
          status: "active",
          media: [{ url: item.imageUrl, type: "image" }],
          weightGrams: item.weightGrams,
          shippingClass: "standard",
        })
        .returning();
      productId = inserted.id;
      console.log(`   ✓ Created product: ${item.name} (SKU: ${item.sku})`);
    } else {
      console.log(`   • Existing product found: ${item.name} (${item.sku})`);
    }

    // Insert or update central inventory
    await db
      .insert(schema.inventory)
      .values({
        productId,
        sku: item.sku,
        quantity: item.stock,
        lowStockThreshold: item.lowStockThreshold,
        binLocation: item.binLocation,
        stockAvailability: "in_stock",
      })
      .onConflictDoUpdate({
        target: [schema.inventory.productId],
        set: {
          quantity: item.stock,
          lowStockThreshold: item.lowStockThreshold,
          binLocation: item.binLocation,
          updatedAt: new Date(),
        },
      });

    // Insert or update branch inventory
    await db
      .insert(schema.branchInventory)
      .values({
        branchId: defaultBranch.id,
        productId,
        sku: item.sku,
        quantity: item.stock,
        binLocation: item.binLocation,
      })
      .onConflictDoUpdate({
        target: [schema.branchInventory.branchId, schema.branchInventory.productId],
        set: {
          quantity: item.stock,
          binLocation: item.binLocation,
          updatedAt: new Date(),
        },
      });
  }

  console.log(`\n======================================================`);
  console.log(`🎉 Demo Seeding Complete!`);
  console.log(`   • Organization: ${targetOrgId}`);
  console.log(`   • Default Branch: ${defaultBranch.name}`);
  console.log(`   • Products Seeded: ${sampleProducts.length}`);
  console.log(`   • Ready for POS Register and Storefront flow.`);
  console.log(`======================================================\n`);

  await client.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seeding error:", err);
  process.exit(1);
});
