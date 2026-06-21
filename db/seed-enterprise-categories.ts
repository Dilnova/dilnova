import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL not found in environment");
  process.exit(1);
}

const client = postgres(connectionString, { prepare: false });
const db = drizzle(client, { schema });

async function seed() {
  console.log("🌱 Starting Seeding of Enterprise Categorization Tree...");

  // 1. Seed Tax Classes
  console.log("Seeding Tax Classes...");
  const taxValues = [
    { name: 'Standard Rate (15%)', ratePercent: 15.0, code: 'VAT_STD' },
    { name: 'Reduced Rate (5%)', ratePercent: 5.0, code: 'VAT_RED' },
    { name: 'Zero Rated (0%)', ratePercent: 0.0, code: 'VAT_ZERO' },
  ];

  const insertedTaxes = [];
  for (const val of taxValues) {
    const [tax] = await db.insert(schema.taxClasses).values(val)
      .onConflictDoNothing()
      .returning();
    if (tax) {
      insertedTaxes.push(tax);
    }
  }

  // Fallback lookup if already existed
  const allTaxes = await db.select().from(schema.taxClasses);
  const stdTax = allTaxes.find(t => t.code === 'VAT_STD') || allTaxes[0];
  const zeroTax = allTaxes.find(t => t.code === 'VAT_ZERO') || allTaxes[0];

  // 2. Seed Metadata Templates for specific verticals
  console.log("Seeding Metadata Templates...");
  
  // A. Vehicles Template
  const [vehicleTemplate] = await db.insert(schema.metadataTemplates).values({
    name: 'Vehicle Attributes Template',
    fields: [
      { key: 'vin', label: 'VIN / Chassis Number', type: 'string', required: false },
      { key: 'make', label: 'Make', type: 'string', required: true },
      { key: 'model', label: 'Model', type: 'string', required: true },
      { key: 'year', label: 'Year of Manufacture', type: 'number', required: true },
      { key: 'mileage', label: 'Mileage', type: 'number', required: false, unit: 'km' },
      { key: 'fuel_type', label: 'Fuel Type', type: 'string', required: true },
    ]
  }).returning();

  // B. Real Estate / Property Template
  const [propertyTemplate] = await db.insert(schema.metadataTemplates).values({
    name: 'Property Attributes Template',
    fields: [
      { key: 'bedrooms', label: 'Number of Bedrooms', type: 'number', required: false },
      { key: 'bathrooms', label: 'Number of Bathrooms', type: 'number', required: false },
      { key: 'square_footage', label: 'Square Footage / Area', type: 'number', required: false, unit: 'sqft' },
      { key: 'property_type', label: 'Property Type', type: 'string', required: true },
    ]
  }).returning();

  // C. Electronics & Mobiles Template
  const [electronicsTemplate] = await db.insert(schema.metadataTemplates).values({
    name: 'Electronics & Mobiles Template',
    fields: [
      { key: 'brand', label: 'Brand', type: 'string', required: true },
      { key: 'model', label: 'Model Name/Number', type: 'string', required: true },
      { key: 'storage_capacity', label: 'Storage Capacity', type: 'string', required: false },
      { key: 'color', label: 'Color', type: 'string', required: false },
    ]
  }).returning();

  // D. Living Organisms (Animals & Plants)
  const [livingOrganismTemplate] = await db.insert(schema.metadataTemplates).values({
    name: 'Living Organisms Template',
    fields: [
      { key: 'species', label: 'Species / Scientific Name', type: 'string', required: true },
      { key: 'breed_type', label: 'Breed / Variety', type: 'string', required: false },
      { key: 'care_instructions', label: 'Care / Watering Instructions', type: 'string', required: false },
    ]
  }).returning();

  // E. Cosmetics & Beauty Template
  const [cosmeticsTemplate] = await db.insert(schema.metadataTemplates).values({
    name: 'Cosmetics & Beauty Template',
    fields: [
      { key: 'skin_type', label: 'Skin Type Suitability', type: 'array', required: false },
      { key: 'ingredients', label: 'Ingredients List', type: 'array', required: false },
      { key: 'shade', label: 'Shade / Color Option', type: 'string', required: false },
    ]
  }).returning();

  // F. Services Template
  const [servicesTemplate] = await db.insert(schema.metadataTemplates).values({
    name: 'Service Details Template',
    fields: [
      { key: 'duration_mins', label: 'Standard Duration (Minutes)', type: 'number', required: true },
      { key: 'location_type', label: 'Location Type (In-store/Remote/Client)', type: 'string', required: true },
    ]
  }).returning();

  console.log("✓ Templates and Tax groups populated.");

  // 3. Helper to insert categories recursively
  console.log("Populating Hierarchical Category Trees...");

  const categoriesToSeed = [
    // --- VEHICLES ---
    {
      name: 'Vehicles',
      slug: 'vehicles',
      templateId: vehicleTemplate.id,
      taxId: stdTax.id,
      children: [
        { name: 'Cars', slug: 'vehicles-cars' },
        { name: 'Motorcycles & Powersports', slug: 'vehicles-motorcycles' },
        { name: 'Automotive Parts & Accessories', slug: 'vehicles-parts' },
      ],
    },
    // --- PROPERTY ---
    {
      name: 'Property',
      slug: 'property',
      templateId: propertyTemplate.id,
      taxId: stdTax.id,
      children: [
        { name: 'Rentals', slug: 'property-rentals' },
        { name: 'Sales', slug: 'property-sales' },
      ],
    },
    // --- ELECTRONICS & MOBILES ---
    {
      name: 'Electronics',
      slug: 'electronics',
      templateId: electronicsTemplate.id,
      taxId: stdTax.id,
      children: [
        { name: 'Mobiles', slug: 'electronics-mobiles' },
        { name: 'Cell Phones & Accessories', slug: 'electronics-phone-accessories' },
        { name: 'Appliances', slug: 'electronics-appliances' },
      ],
    },
    // --- SERVICES ---
    {
      name: 'Services',
      slug: 'services',
      templateId: servicesTemplate.id,
      taxId: zeroTax.id,
      children: [
        { name: 'Education & Tutoring', slug: 'services-education' },
        { name: 'Business & Industry Services', slug: 'services-business' },
        { name: 'Work Overseas', slug: 'services-work-overseas' },
      ],
    },
    // --- HOME & GARDEN ---
    {
      name: 'Home & Garden',
      slug: 'home-garden',
      templateId: null,
      taxId: stdTax.id,
      children: [
        { name: 'Furniture', slug: 'home-garden-furniture' },
        { name: 'Patio, Lawn & Garden', slug: 'home-garden-patio' },
        { name: 'Tools & Home Improvement', slug: 'home-garden-tools' },
      ],
    },
    // --- FASHION & BEAUTY ---
    {
      name: 'Fashion & Beauty',
      slug: 'fashion-beauty',
      templateId: cosmeticsTemplate.id,
      taxId: stdTax.id,
      children: [
        { name: "Women's Clothing", slug: 'fashion-womens-clothing' },
        { name: "Men's Clothing", slug: 'fashion-mens-clothing' },
        { name: 'Shoes', slug: 'fashion-shoes' },
        { name: 'Jewelry & Accessories', slug: 'fashion-accessories' },
        { name: 'Beauty & Health', slug: 'fashion-beauty-health' },
        { name: 'Hair Extensions & Wigs', slug: 'fashion-hair-wigs' },
      ],
    },
    // --- ANIMALS & PLANTS ---
    {
      name: 'Animals',
      slug: 'animals',
      templateId: livingOrganismTemplate.id,
      taxId: stdTax.id,
      children: [
        { name: 'Pet Supplies', slug: 'animals-pet-supplies' },
      ],
    },
    // --- FOOD & GROCERY ---
    {
      name: 'Food & Grocery',
      slug: 'food-grocery',
      templateId: null,
      taxId: zeroTax.id,
      children: [],
    },
    // --- HOBBY, SPORT & KIDS ---
    {
      name: 'Hobby, Sport & Kids',
      slug: 'hobby-sport-kids',
      templateId: null,
      taxId: stdTax.id,
      children: [
        { name: 'Toys & Games', slug: 'hobby-toys-games' },
        { name: 'Sports & Outdoors', slug: 'hobby-sports-outdoors' },
        { name: 'Novelty & Special Use', slug: 'hobby-novelty' },
        { name: 'Arts, Crafts & Sewing', slug: 'hobby-crafts' },
        { name: 'Books & Media', slug: 'hobby-books-media' },
      ],
    },
    // --- OTHER REMAINING VERTICALS ---
    {
      name: 'Baby & Maternity',
      slug: 'baby-maternity',
      templateId: null,
      taxId: stdTax.id,
      children: [],
    },
    {
      name: 'Bags & Luggage',
      slug: 'bags-luggage',
      templateId: null,
      taxId: stdTax.id,
      children: [],
    },
    {
      name: 'Office & School Supplies',
      slug: 'office-school',
      templateId: null,
      taxId: stdTax.id,
      children: [],
    },
    {
      name: 'Agriculture',
      slug: 'agriculture',
      templateId: null,
      taxId: zeroTax.id,
      children: [],
    },
    {
      name: 'Essentials',
      slug: 'essentials',
      templateId: null,
      taxId: zeroTax.id,
      children: [],
    },
    {
      name: 'Jobs',
      slug: 'jobs',
      templateId: null,
      taxId: zeroTax.id,
      children: [],
    },
    {
      name: 'Other',
      slug: 'other',
      templateId: null,
      taxId: stdTax.id,
      children: [],
    },
  ];

  for (const parent of categoriesToSeed) {
    const [insertedParent] = await db.insert(schema.categories).values({
      name: parent.name,
      slug: parent.slug,
      localizedNames: { en: parent.name },
      metadataTemplateId: parent.templateId,
      taxClassId: parent.taxId,
    }).onConflictDoNothing().returning();

    // In case category existed, fetch it to reference parent ID
    const parentId = insertedParent?.id || (
      await db.select().from(schema.categories).where(sql`slug = ${parent.slug}`)
    )[0]?.id;

    if (parentId && parent.children.length > 0) {
      console.log(`  └─ Populating children for "${parent.name}"...`);
      for (const child of parent.children) {
        await db.insert(schema.categories).values({
          parentId: parentId,
          name: child.name,
          slug: child.slug,
          localizedNames: { en: child.name },
          metadataTemplateId: parent.templateId, // inherits template from parent
          taxClassId: parent.taxId, // inherits tax from parent
        }).onConflictDoNothing();
      }
    }
  }

  console.log("\n✅ All Category Trees populated successfully!");
  await client.end();
}

seed().catch(err => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
