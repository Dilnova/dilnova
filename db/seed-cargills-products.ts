import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import { sql, eq } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
const clerkSecretKey = process.env.CLERK_SECRET_KEY;

if (!connectionString) {
  console.error("DATABASE_URL not found in environment");
  process.exit(1);
}

const client = postgres(connectionString, { prepare: false });
const db = drizzle(client, { schema });

async function seedCargills() {
  console.log("🌱 Starting Seeding of 100 Supermarket Products for Cargills...");

  // 1. Resolve organization ID from Clerk if possible, otherwise use fallback
  let orgId = "cargills-1779360325802766552"; // default fallback ID from user request

  if (clerkSecretKey) {
    try {
      console.log("Checking Clerk for organization ID...");
      const response = await fetch("https://api.clerk.com/v1/organizations?limit=100", {
        headers: {
          Authorization: `Bearer ${clerkSecretKey}`,
          "Content-Type": "application/json",
        },
      });
      const orgData = await response.json();
      const orgList = { data: orgData.data || [] };

      const realOrg = orgList.data.find(
        (o: { id: string; slug: string; name: string }) =>
          o.id === "cargills-1779360325802766552" ||
          o.slug === "cargills-1779360325802766552" ||
          o.name.toLowerCase().includes("cargills") ||
          o.slug.includes("cargills"),
      );

      if (realOrg) {
        orgId = realOrg.id;
        console.log(`✓ Resolved real Clerk Org ID: ${orgId} (${realOrg.name})`);
      } else {
        console.log(`Using fallback Org ID: ${orgId}`);
      }
    } catch (e) {
      console.error("Failed to connect to Clerk, using fallback Org ID:", e);
    }
  } else {
    console.log(`Using fallback Org ID: ${orgId}`);
  }

  // 2. Resolve or create categories
  console.log("Resolving subcategories...");

  // Helper to fetch or create a category
  async function getOrCreateCategory(slug: string, name: string, parentSlug?: string) {
    let parentId: string | undefined = undefined;
    if (parentSlug) {
      const parents = await db
        .select()
        .from(schema.categories)
        .where(sql`slug = ${parentSlug}`);
      parentId = parents[0]?.id;
    }

    const [existing] = await db
      .select()
      .from(schema.categories)
      .where(sql`slug = ${slug}`);
    if (existing) return existing;

    const [created] = await db
      .insert(schema.categories)
      .values({
        name,
        slug,
        parentId,
        localizedNames: { en: name },
      })
      .returning();
    return created;
  }

  // Food & Grocery subcategories
  await getOrCreateCategory("food-grocery", "Food & Grocery");
  const catDairy = await getOrCreateCategory("grocery-dairy", "Dairy & Eggs", "food-grocery");
  const catProduce = await getOrCreateCategory("grocery-produce", "Fresh Produce", "food-grocery");
  const catBakery = await getOrCreateCategory("grocery-bakery", "Bakery & Bread", "food-grocery");
  const catBeverages = await getOrCreateCategory("grocery-beverages", "Beverages", "food-grocery");
  const catMeat = await getOrCreateCategory("grocery-meat", "Meat & Seafood", "food-grocery");
  const catPantry = await getOrCreateCategory("grocery-pantry", "Pantry & Grains", "food-grocery");
  const catSnacks = await getOrCreateCategory("grocery-snacks", "Snacks & Sweets", "food-grocery");

  // Cosmetics & Personal Care
  await getOrCreateCategory("fashion-beauty", "Fashion & Beauty");
  const catBeauty = await getOrCreateCategory("beauty-health", "Beauty & Health", "fashion-beauty");

  // Household & Cleaning (under Home & Garden)
  await getOrCreateCategory("home-garden", "Home & Garden");
  const catHousehold = await getOrCreateCategory(
    "home-household",
    "Household & Cleaning",
    "home-garden",
  );

  const categoriesMap = {
    dairy: catDairy.id,
    produce: catProduce.id,
    bakery: catBakery.id,
    beverages: catBeverages.id,
    meat: catMeat.id,
    pantry: catPantry.id,
    snacks: catSnacks.id,
    beauty: catBeauty.id,
    household: catHousehold.id,
  };

  // 3. Define 100 realistic supermarket products
  console.log("Generating 100 products...");

  const templates = {
    dairy: [
      {
        name: "Fresh Milk 1L",
        price: 350,
        image:
          "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop&q=80",
        attributes: { perishable: true, expiry_days: 12, allergens: ["dairy"], temp_c: 4 },
      },
      {
        name: "Salted Butter 250g",
        price: 620,
        image:
          "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=600&auto=format&fit=crop&q=80",
        attributes: { perishable: true, allergens: ["dairy"], temp_c: 4 },
      },
      {
        name: "Cheddar Cheese Slice Pack",
        price: 890,
        image:
          "https://images.unsplash.com/photo-1618067424218-a0957b6f68c9?w=600&auto=format&fit=crop&q=80",
        attributes: { perishable: true, allergens: ["dairy"], temp_c: 4 },
      },
      {
        name: "Greek Yogurt Strawberry 150g",
        price: 180,
        image:
          "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&auto=format&fit=crop&q=80",
        attributes: { perishable: true, allergens: ["dairy"], temp_c: 4 },
      },
      {
        name: "Fresh Large Eggs 12 Pack",
        price: 420,
        image:
          "https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=600&auto=format&fit=crop&q=80",
        attributes: { perishable: true, temp_c: 12 },
      },
      {
        name: "Sour Cream 200g",
        price: 290,
        image:
          "https://images.unsplash.com/photo-1528751004905-6af247a493f8?w=600&auto=format&fit=crop&q=80",
        attributes: { perishable: true, allergens: ["dairy"], temp_c: 4 },
      },
      {
        name: "Whipped Cream Spray Can",
        price: 750,
        image:
          "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600&auto=format&fit=crop&q=80",
        attributes: { allergens: ["dairy"], temp_c: 4 },
      },
      {
        name: "Mozzarella Block 500g",
        price: 1200,
        image:
          "https://images.unsplash.com/photo-1559561853-08451507cbe7?w=600&auto=format&fit=crop&q=80",
        attributes: { perishable: true, allergens: ["dairy"], temp_c: 4 },
      },
      {
        name: "Low Fat Soy Milk 1L",
        price: 410,
        image:
          "https://images.unsplash.com/photo-1576186726115-4d51596775d1?w=600&auto=format&fit=crop&q=80",
        attributes: { allergens: ["soy"], perishable: false },
      },
      {
        name: "Parmesan Grated Cheese 100g",
        price: 680,
        image:
          "https://images.unsplash.com/photo-1608686207856-001b95cf60ca?w=600&auto=format&fit=crop&q=80",
        attributes: { allergens: ["dairy"], temp_c: 4 },
      },
      {
        name: "Chocolate Milk Bottle 250ml",
        price: 150,
        image:
          "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=600&auto=format&fit=crop&q=80",
        attributes: { perishable: true, allergens: ["dairy"], temp_c: 4 },
      },
    ],
    produce: [
      {
        name: "Red Apples 1kg",
        price: 690,
        image:
          "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=600&auto=format&fit=crop&q=80",
        attributes: { organic: true, perishable: true },
      },
      {
        name: "Cavendish Bananas 1kg",
        price: 320,
        image:
          "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600&auto=format&fit=crop&q=80",
        attributes: { perishable: true },
      },
      {
        name: "Fresh Broccoli Crown 500g",
        price: 450,
        image:
          "https://images.unsplash.com/photo-1584270354949-c26b0d5b4a0c?w=600&auto=format&fit=crop&q=80",
        attributes: { perishable: true },
      },
      {
        name: "Roma Tomatoes 1kg",
        price: 380,
        image:
          "https://images.unsplash.com/photo-1595855759920-86582396756a?w=600&auto=format&fit=crop&q=80",
        attributes: { perishable: true },
      },
      {
        name: "Yellow Onions 1kg",
        price: 290,
        image:
          "https://images.unsplash.com/photo-1508747703725-719ae2c73ee0?w=600&auto=format&fit=crop&q=80",
        attributes: { shelf_life_weeks: 6 },
      },
      {
        name: "Fresh Garlic Bulb Pack",
        price: 180,
        image:
          "https://images.unsplash.com/photo-1568584711075-3d021a7c3ec3?w=600&auto=format&fit=crop&q=80",
        attributes: { shelf_life_weeks: 12 },
      },
      {
        name: "Organic Spinach Pre-washed",
        price: 340,
        image:
          "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600&auto=format&fit=crop&q=80",
        attributes: { organic: true, perishable: true },
      },
      {
        name: "Baby Carrots Bag 500g",
        price: 280,
        image:
          "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=600&auto=format&fit=crop&q=80",
        attributes: { perishable: true },
      },
      {
        name: "Potatoes Russet 2kg Bag",
        price: 540,
        image:
          "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&auto=format&fit=crop&q=80",
        attributes: { shelf_life_weeks: 8 },
      },
      {
        name: "Fresh Strawberries Clamshell",
        price: 780,
        image:
          "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=600&auto=format&fit=crop&q=80",
        attributes: { perishable: true },
      },
      {
        name: "Green Seedless Grapes 500g",
        price: 650,
        image:
          "https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?w=600&auto=format&fit=crop&q=80",
        attributes: { perishable: true },
      },
      {
        name: "Fresh Lemon Bag 5 Pack",
        price: 250,
        image:
          "https://images.unsplash.com/photo-1590502593747-42a996133562?w=600&auto=format&fit=crop&q=80",
        attributes: { perishable: true },
      },
    ],
    bakery: [
      {
        name: "White Sandwich Bread 450g",
        price: 170,
        image:
          "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80",
        attributes: { perishable: true, shelf_life_days: 5, allergens: ["wheat"] },
      },
      {
        name: "Whole Wheat Sliced Bread",
        price: 210,
        image:
          "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=600&auto=format&fit=crop&q=80",
        attributes: { perishable: true, shelf_life_days: 5, allergens: ["wheat"] },
      },
      {
        name: "French Baguette",
        price: 190,
        image:
          "https://images.unsplash.com/photo-1509459316474-0f2ceb0ae888?w=600&auto=format&fit=crop&q=80",
        attributes: { perishable: true, shelf_life_days: 2, allergens: ["wheat"] },
      },
      {
        name: "Butter Croissants 4 Pack",
        price: 480,
        image:
          "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80",
        attributes: { allergens: ["wheat", "dairy"], perishable: true },
      },
      {
        name: "Chocolate Chip Cookies Pack",
        price: 350,
        image:
          "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=600&auto=format&fit=crop&q=80",
        attributes: { allergens: ["wheat", "dairy", "eggs"] },
      },
      {
        name: "Hamburger Buns 6 Pack",
        price: 260,
        image:
          "https://images.unsplash.com/photo-1589156280159-27698a70f29e?w=600&auto=format&fit=crop&q=80",
        attributes: { allergens: ["wheat"], shelf_life_days: 7 },
      },
      {
        name: "Blueberry Muffins 2 Pack",
        price: 320,
        image:
          "https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=600&auto=format&fit=crop&q=80",
        attributes: { allergens: ["wheat", "eggs"], perishable: true },
      },
      {
        name: "Pita Flatbread Pack",
        price: 290,
        image:
          "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80",
        attributes: { allergens: ["wheat"] },
      },
      {
        name: "English Muffins 6 Pack",
        price: 340,
        image:
          "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80",
        attributes: { allergens: ["wheat"] },
      },
      {
        name: "Gluten Free Sliced Bread",
        price: 490,
        image:
          "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=600&auto=format&fit=crop&q=80",
        attributes: { gluten_free: true },
      },
      {
        name: "Cinnamon Rolls 4 Pack",
        price: 520,
        image:
          "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80",
        attributes: { allergens: ["wheat", "dairy"], perishable: true },
      },
    ],
    beverages: [
      {
        name: "Coca-Cola 1.5L Bottle",
        price: 250,
        image:
          "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80",
        attributes: { type: "carbonated", sugar_g: 39 },
      },
      {
        name: "Diet Coke Can 330ml",
        price: 120,
        image:
          "https://images.unsplash.com/photo-1525193612162-ab3cf94f5b2b?w=600&auto=format&fit=crop&q=80",
        attributes: { diet: true, sugar_g: 0 },
      },
      {
        name: "Pure Mineral Water 5L",
        price: 310,
        image:
          "https://images.unsplash.com/photo-1523362628745-0c100150b504?w=600&auto=format&fit=crop&q=80",
        attributes: { type: "mineral_water" },
      },
      {
        name: "100% Orange Juice 1L",
        price: 550,
        image:
          "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=600&auto=format&fit=crop&q=80",
        attributes: { no_added_sugar: true, perishable: true },
      },
      {
        name: "Apple Juice Carton 1L",
        price: 490,
        image:
          "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=600&auto=format&fit=crop&q=80",
        attributes: { type: "juice" },
      },
      {
        name: "Organic Green Tea 25 Bags",
        price: 380,
        image:
          "https://images.unsplash.com/photo-1627435601361-ec25f5b1d0e5?w=600&auto=format&fit=crop&q=80",
        attributes: { organic: true },
      },
      {
        name: "Roasted Arabica Coffee Beans 250g",
        price: 1250,
        image:
          "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80",
        attributes: { roast: "Medium" },
      },
      {
        name: "Tonic Water Bottle 1L",
        price: 220,
        image:
          "https://images.unsplash.com/photo-1598880940080-ff9a29891b85?w=600&auto=format&fit=crop&q=80",
        attributes: { type: "mixer" },
      },
      {
        name: "Sparkling Lime Water Can",
        price: 130,
        image:
          "https://images.unsplash.com/photo-1543257580-7269da773bf5?w=600&auto=format&fit=crop&q=80",
        attributes: { sugar_g: 0 },
      },
      {
        name: "Energy Drink Can 250ml",
        price: 280,
        image:
          "https://images.unsplash.com/photo-1622543956221-259c0243de3a?w=600&auto=format&fit=crop&q=80",
        attributes: { high_caffeine: true },
      },
      {
        name: "Instant Coffee Premium 100g",
        price: 890,
        image:
          "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80",
        attributes: { type: "freeze_dried" },
      },
    ],
    meat: [
      {
        name: "Chicken Breast Boneless 1kg",
        price: 1450,
        image:
          "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=600&auto=format&fit=crop&q=80",
        attributes: { perishable: true, temp_c: 2 },
      },
      {
        name: "Beef Ribeye Steak 300g",
        price: 2200,
        image:
          "https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=600&auto=format&fit=crop&q=80",
        attributes: { perishable: true, temp_c: 2 },
      },
      {
        name: "Pork Loin Chops 500g",
        price: 1100,
        image:
          "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80",
        attributes: { perishable: true, temp_c: 2 },
      },
      {
        name: "Fresh Salmon Fillet 200g",
        price: 1850,
        image:
          "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&auto=format&fit=crop&q=80",
        attributes: { perishable: true, allergens: ["fish"], temp_c: 2 },
      },
      {
        name: "Raw Tiger Prawns 500g",
        price: 1650,
        image:
          "https://images.unsplash.com/photo-1559737605-de6a4c052d8b?w=600&auto=format&fit=crop&q=80",
        attributes: { perishable: true, allergens: ["crustacean"], temp_c: 2 },
      },
      {
        name: "Minced Beef Lean 500g",
        price: 980,
        image:
          "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=600&auto=format&fit=crop&q=80",
        attributes: { perishable: true, temp_c: 2 },
      },
      {
        name: "Chicken Drumsticks Pack 1kg",
        price: 1150,
        image:
          "https://images.unsplash.com/photo-1606728035253-49e8a23146de?w=600&auto=format&fit=crop&q=80",
        attributes: { perishable: true, temp_c: 2 },
      },
      {
        name: "Smoked Bacon Strips 200g",
        price: 790,
        image:
          "https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=600&auto=format&fit=crop&q=80",
        attributes: { perishable: true, temp_c: 4 },
      },
      {
        name: "Lamb Loin Chops 400g",
        price: 2100,
        image:
          "https://images.unsplash.com/photo-1602489114777-6bc8279f04d7?w=600&auto=format&fit=crop&q=80",
        attributes: { perishable: true, temp_c: 2 },
      },
      {
        name: "Canned Tuna in Brine 185g",
        price: 340,
        image:
          "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=600&auto=format&fit=crop&q=80",
        attributes: { allergens: ["fish"] },
      },
      {
        name: "Turkey Breast Slices Pack",
        price: 680,
        image:
          "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=600&auto=format&fit=crop&q=80",
        attributes: { perishable: true, temp_c: 4 },
      },
    ],
    pantry: [
      {
        name: "Basmati Rice Premium 5kg",
        price: 1850,
        image:
          "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=80",
        attributes: { grain_type: "long_grain" },
      },
      {
        name: "Penne Rigate Pasta 500g",
        price: 240,
        image:
          "https://images.unsplash.com/photo-1621961477414-ac6093679012?w=600&auto=format&fit=crop&q=80",
        attributes: { allergens: ["wheat"] },
      },
      {
        name: "Extra Virgin Olive Oil 750ml",
        price: 2350,
        image:
          "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&auto=format&fit=crop&q=80",
        attributes: { cold_pressed: true },
      },
      {
        name: "Refined White Sugar 1kg",
        price: 220,
        image:
          "https://images.unsplash.com/photo-1581781890333-e760bf03437e?w=600&auto=format&fit=crop&q=80",
        attributes: { type: "cane_sugar" },
      },
      {
        name: "Iodized Table Salt 1kg",
        price: 90,
        image:
          "https://images.unsplash.com/photo-1604838606673-c15c20a6a2e4?w=600&auto=format&fit=crop&q=80",
        attributes: { iodized: true },
      },
      {
        name: "Rolled Oats Canister 1kg",
        price: 590,
        image:
          "https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=600&auto=format&fit=crop&q=80",
        attributes: { type: "oatmeal" },
      },
      {
        name: "Organic Honey Wild 500g",
        price: 1150,
        image:
          "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&auto=format&fit=crop&q=80",
        attributes: { organic: true },
      },
      {
        name: "Creamy Peanut Butter 375g",
        price: 620,
        image:
          "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=600&auto=format&fit=crop&q=80",
        attributes: { allergens: ["peanuts"] },
      },
      {
        name: "Tomato Ketchup Squeeze Bottle",
        price: 340,
        image:
          "https://images.unsplash.com/photo-1607305387299-a3d9611cd46f?w=600&auto=format&fit=crop&q=80",
        attributes: { container: "plastic" },
      },
      {
        name: "Canned Sweet Corn 400g",
        price: 180,
        image:
          "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=600&auto=format&fit=crop&q=80",
        attributes: {},
      },
      {
        name: "All-Purpose Wheat Flour 1kg",
        price: 260,
        image:
          "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80",
        attributes: { allergens: ["wheat"] },
      },
      {
        name: "Red Lentils (Masoor Dal) 1kg",
        price: 420,
        image:
          "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=80",
        attributes: {},
      },
    ],
    snacks: [
      {
        name: "Potato Chips Salted 150g",
        price: 280,
        image:
          "https://images.unsplash.com/photo-1566478989037-eec170784d20?w=600&auto=format&fit=crop&q=80",
        attributes: { sodium_mg: 180 },
      },
      {
        name: "Milk Chocolate Bar 100g",
        price: 340,
        image:
          "https://images.unsplash.com/photo-1511381939415-e44015466834?w=600&auto=format&fit=crop&q=80",
        attributes: { allergens: ["dairy", "soy"] },
      },
      {
        name: "Salted Roasted Almonds 200g",
        price: 850,
        image:
          "https://images.unsplash.com/photo-1508061253366-f7da158b6d96?w=600&auto=format&fit=crop&q=80",
        attributes: { allergens: ["tree_nuts"] },
      },
      {
        name: "Gummy Bears Fruit Candy Bag",
        price: 210,
        image:
          "https://images.unsplash.com/photo-1581798459219-318e76aecc7b?w=600&auto=format&fit=crop&q=80",
        attributes: { gelatin: true },
      },
      {
        name: "Tortilla Chips Cheese 200g",
        price: 390,
        image:
          "https://images.unsplash.com/photo-1518047601542-79f18c655718?w=600&auto=format&fit=crop&q=80",
        attributes: { allergens: ["dairy"] },
      },
      {
        name: "Popcorn Butter Microwavable",
        price: 190,
        image:
          "https://images.unsplash.com/photo-1578849278619-e73505e9610f?w=600&auto=format&fit=crop&q=80",
        attributes: { allergens: ["dairy"] },
      },
      {
        name: "Dark Chocolate 70% Cocoa 100g",
        price: 420,
        image:
          "https://images.unsplash.com/photo-1606312440599-43b88ac95df7?w=600&auto=format&fit=crop&q=80",
        attributes: { organic: true },
      },
      {
        name: "Oat & Honey Granola Bar 6 Pack",
        price: 480,
        image:
          "https://images.unsplash.com/photo-1568254183919-78a4f43a2877?w=600&auto=format&fit=crop&q=80",
        attributes: { allergens: ["oats"] },
      },
      {
        name: "Pretzels Mini Twists Bag",
        price: 260,
        image:
          "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=600&auto=format&fit=crop&q=80",
        attributes: { allergens: ["wheat"] },
      },
      {
        name: "Cheese Crackers Box 200g",
        price: 350,
        image:
          "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80",
        attributes: { allergens: ["wheat", "dairy"] },
      },
      {
        name: "Mixed Berries Fruit Snack Pack",
        price: 290,
        image:
          "https://images.unsplash.com/photo-1606757389105-64e8a4ec000d?w=600&auto=format&fit=crop&q=80",
        attributes: {},
      },
    ],
    beauty: [
      {
        name: "Moisturizing Aloe Vera Body Wash",
        price: 650,
        image:
          "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&auto=format&fit=crop&q=80",
        attributes: { skin_type: ["Dry", "Normal"], cruelty_free: true },
      },
      {
        name: "Gentle Face Cleanser Foaming",
        price: 890,
        image:
          "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=80",
        attributes: { skin_type: ["Sensitive", "Oily"], sulfate_free: true },
      },
      {
        name: "Hydrating Hyaluronic Acid Serum",
        price: 1450,
        image:
          "https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=600&auto=format&fit=crop&q=80",
        attributes: { concentration: "2%", skin_type: ["All"] },
      },
      {
        name: "Mineral Sunscreen SPF 50",
        price: 1100,
        image:
          "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=600&auto=format&fit=crop&q=80",
        attributes: { reef_safe: true, water_resistant: true },
      },
      {
        name: "Coconut Conditioner Anti-Frizz",
        price: 540,
        image:
          "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=600&auto=format&fit=crop&q=80",
        attributes: { hair_type: "Dry", paraben_free: true },
      },
      {
        name: "Argan Oil Hair Treatment",
        price: 1250,
        image:
          "https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=600&auto=format&fit=crop&q=80",
        attributes: { organic: true },
      },
      {
        name: "Shea Butter Hand Cream 75ml",
        price: 380,
        image:
          "https://images.unsplash.com/photo-1617897903246-719242758050?w=600&auto=format&fit=crop&q=80",
        attributes: { travel_size: true },
      },
      {
        name: "Volumizing Biotin Shampoo",
        price: 580,
        image:
          "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=600&auto=format&fit=crop&q=80",
        attributes: { hair_type: "Fine" },
      },
      {
        name: "Clay Mask Pore Purifying",
        price: 790,
        image:
          "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&auto=format&fit=crop&q=80",
        attributes: { skin_type: ["Oily", "Combination"] },
      },
      {
        name: "Vitamin C Brightening Moisturizer",
        price: 1350,
        image:
          "https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?w=600&auto=format&fit=crop&q=80",
        attributes: { skin_type: ["Normal", "Combination"] },
      },
      {
        name: "Tea Tree Face Spot Treatment",
        price: 490,
        image:
          "https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=600&auto=format&fit=crop&q=80",
        attributes: { alcohol_free: true },
      },
    ],
    household: [
      {
        name: "Liquid Laundry Detergent 2L",
        price: 1150,
        image:
          "https://images.unsplash.com/photo-1610555356070-d0efb6505f81?w=600&auto=format&fit=crop&q=80",
        attributes: { loads_count: 50, scent: "Fresh Lavender" },
      },
      {
        name: "Multi-Surface Cleaning Spray",
        price: 380,
        image:
          "https://images.unsplash.com/photo-1585421514738-ee184db7850e?w=600&auto=format&fit=crop&q=80",
        attributes: { kill_rate: "99.9%", antibacterial: true },
      },
      {
        name: "Antibacterial Dishwashing Liquid",
        price: 290,
        image:
          "https://images.unsplash.com/photo-1607006342460-e7e11804c9bc?w=600&auto=format&fit=crop&q=80",
        attributes: { scent: "Lemon Squeeze" },
      },
      {
        name: "Premium Toilet Roll 12 Pack",
        price: 820,
        image:
          "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&auto=format&fit=crop&q=80",
        attributes: { ply: 3 },
      },
      {
        name: "Heavy Duty Kitchen Sponge 3 Pack",
        price: 180,
        image:
          "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=600&auto=format&fit=crop&q=80",
        attributes: { double_sided: true },
      },
      {
        name: "All-Purpose Microfiber Cloths 5 Pack",
        price: 420,
        image:
          "https://images.unsplash.com/photo-1583947581924-860bda6a26df?w=600&auto=format&fit=crop&q=80",
        attributes: { lint_free: true },
      },
      {
        name: "Trash Bags Drawstring 30L 50pk",
        price: 690,
        image:
          "https://images.unsplash.com/photo-1610555356070-d0efb6505f81?w=600&auto=format&fit=crop&q=80",
        attributes: { thickness_microns: 25 },
      },
      {
        name: "Glass and Window Spray Cleaner",
        price: 350,
        image:
          "https://images.unsplash.com/photo-1585421514738-ee184db7850e?w=600&auto=format&fit=crop&q=80",
        attributes: { streak_free: true },
      },
      {
        name: "Drain Opener Gel 1L",
        price: 540,
        image:
          "https://images.unsplash.com/photo-1610555356070-d0efb6505f81?w=600&auto=format&fit=crop&q=80",
        attributes: { toxic: true },
      },
      {
        name: "Air Freshener Spray Linen Room",
        price: 280,
        image:
          "https://images.unsplash.com/photo-1610555356070-d0efb6505f81?w=600&auto=format&fit=crop&q=80",
        attributes: { aerosol: true },
      },
      {
        name: "Fabric Softener Spring Blossom 1.5L",
        price: 790,
        image:
          "https://images.unsplash.com/photo-1610555356070-d0efb6505f81?w=600&auto=format&fit=crop&q=80",
        attributes: { scent: "Floral" },
      },
    ],
  };

  const productInsertions = [];
  let barcodeNum = 8801234567890;
  let skuCounter = 1000;

  // Flatten and expand to exactly 100 items
  const keys = Object.keys(templates) as Array<keyof typeof templates>;
  let count = 0;

  while (count < 100) {
    const key = keys[count % keys.length];
    const categoryId = categoriesMap[key];
    const itemTemplateList = templates[key];
    const itemIndex = Math.floor(count / keys.length) % itemTemplateList.length;
    const template = itemTemplateList[itemIndex];

    skuCounter++;
    barcodeNum++;
    count++;

    // Generate unique name variations if needed
    const suffix = count > 50 ? ` II` : "";
    const priceAdjustment = (count % 5) * 20 - 40; // slightly vary prices
    const itemPrice = Math.max(80, template.price + priceAdjustment);

    productInsertions.push({
      name: `${template.name}${suffix}`,
      type: "product",
      description: `Premium grade supermarket item. Specially selected for high quality and value.`,
      price: itemPrice,
      imageUrl: template.image,
      orgId: orgId,
      categoryId: categoryId,
      sku: `CARG-${key.toUpperCase()}-${skuCounter}`,
      barcodes: [barcodeNum.toString()],
      status: "active",
      attributes: {
        ...template.attributes,
        brand: "Cargills Choice",
        pack_size: `${(count % 3) + 1}x pack`,
        imported: count % 4 === 0,
      },
      views: Math.floor(Math.random() * 250),
    });
  }

  // Clear old products to allow fresh re-seeding
  console.log("Clearing existing products for Cargills to prevent duplicates...");
  await db.delete(schema.products).where(eq(schema.products.orgId, orgId));

  // Insert items in chunks to be efficient
  console.log(`Inserting ${productInsertions.length} products to database...`);
  const insertedProducts = [];
  const chunkSize = 25;
  for (let i = 0; i < productInsertions.length; i += chunkSize) {
    const chunk = productInsertions.slice(i, i + chunkSize);
    const result = await db.insert(schema.products).values(chunk).returning();
    insertedProducts.push(...result);
    console.log(
      `  inserted products ${i + 1} to ${Math.min(i + chunkSize, productInsertions.length)}`,
    );
  }

  // Populate central inventory & movements so POS Register shows them
  console.log("Initializing stock levels in central inventory (essential for POS Register)...");
  for (const product of insertedProducts) {
    const initialQty = 50; // 50 items in stock
    const [inv] = await db
      .insert(schema.inventory)
      .values({
        productId: product.id,
        sku: product.sku,
        quantity: initialQty,
        lowStockThreshold: 5,
        binLocation: `Aisle ${Math.floor(Math.random() * 8) + 1}, Shelf ${String.fromCharCode(65 + Math.floor(Math.random() * 4))}`,
      })
      .returning();

    if (inv) {
      await db.insert(schema.inventoryMovements).values({
        inventoryId: inv.id,
        type: "restock",
        quantityChanged: initialQty,
        previousQuantity: 0,
        newQuantity: initialQty,
        reason: "Initial Seeding",
        userId: "system_seed",
      });
    }
  }

  console.log(
    "\n✅ 100 Supermarket Products & Inventory levels inserted successfully for Cargills!",
  );
  await client.end();
}

seedCargills().catch((err) => {
  console.error("❌ Cargills seeding failed:", err);
  process.exit(1);
});
