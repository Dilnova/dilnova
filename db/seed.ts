import * as dotenv from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Load env variables
dotenv.config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL;
const clerkSecretKey = process.env.CLERK_SECRET_KEY;

if (!connectionString) {
  throw new Error("DATABASE_URL is missing in .env.local");
}

if (process.env.NODE_ENV === "production") {
  console.error("❌ Cannot run seed in production environment! Aborting.");
  process.exit(1);
}

async function main() {
  console.log("🌱 Starting database seed script...");

  // Initialize DB client
  const client = postgres(connectionString!, { prepare: false });
  const db = drizzle(client, { schema });

  // 1. Seed Categories
  console.log("Inserting default categories...");
  await db
    .insert(schema.categories)
    .values([
      { name: "Hardware", slug: "hardware" },
      { name: "Plants", slug: "plants" },
      { name: "Tech Store", slug: "tech" },
      { name: "Services", slug: "services" },
    ])
    .onConflictDoNothing()
    .returning();

  // Fetch all categories to get their IDs
  const allDbCategories = await db.select().from(schema.categories);
  const hardwareCat = allDbCategories.find((c) => c.slug === "hardware");
  const plantsCat = allDbCategories.find((c) => c.slug === "plants");
  const techCat = allDbCategories.find((c) => c.slug === "tech");
  const servicesCat = allDbCategories.find((c) => c.slug === "services");

  if (!hardwareCat || !plantsCat || !techCat || !servicesCat) {
    throw new Error("Failed to retrieve categories after inserting");
  }

  // 2. Fetch Organizations from Clerk to map actual org IDs if they exist
  let hardwareOrgId = "org_hardware_placeholder";
  let nurseryOrgId = "org_nursery_placeholder";
  let techOrgId = "org_tech_placeholder";
  let servicesOrgId = "org_services_placeholder";

  if (clerkSecretKey) {
    try {
      console.log("Connecting to Clerk to fetch real organization IDs...");
      let allOrgs: any[] = [];
      let offset = 0;
      const limit = 100;

      while (true) {
        const response = await fetch(
          `https://api.clerk.com/v1/organizations?limit=${limit}&offset=${offset}`,
          {
            headers: {
              Authorization: `Bearer ${clerkSecretKey}`,
              "Content-Type": "application/json",
            },
          },
        );
        const orgData = await response.json();
        const orgsBatch = orgData.data || [];
        allOrgs = allOrgs.concat(orgsBatch);

        if (orgsBatch.length < limit) {
          break;
        }
        offset += limit;
      }

      const orgList = { data: allOrgs };

      const distarOrgFallback = orgList.data.find(
        (o: any) =>
          o.name.toLowerCase() === "distar" || o.slug === "distar" || o.slug.startsWith("distar-"),
      );

      const hardwareOrg =
        orgList.data.find((o: any) => o.slug === "distar-hardware") || distarOrgFallback;
      const nurseryOrg =
        orgList.data.find((o: any) => o.slug === "distar-nursery") || distarOrgFallback;
      const techOrg = orgList.data.find((o: any) => o.slug === "distar-tech") || distarOrgFallback;
      const servicesOrg =
        orgList.data.find((o: any) => o.slug === "dilstar-services") ||
        orgList.data.find(
          (o: any) =>
            o.slug.startsWith("dilstar-services-") || o.name.toLowerCase() === "dilstar services",
        ) ||
        distarOrgFallback;

      if (hardwareOrg) hardwareOrgId = hardwareOrg.id;
      if (nurseryOrg) nurseryOrgId = nurseryOrg.id;
      if (techOrg) techOrgId = techOrg.id;
      if (servicesOrg) servicesOrgId = servicesOrg.id;

      console.log(
        `Mapped organization IDs: Hardware (${hardwareOrgId}), Nursery (${nurseryOrgId}), Tech (${techOrgId}), Services (${servicesOrgId})`,
      );
    } catch (e) {
      console.error("Clerk fetch failed, falling back to placeholders:", e);
    }
  }

  // 3. Clear existing products to prevent duplicates
  await db.delete(schema.products);

  // 4. Seed Products
  console.log("Inserting seed products and services...");
  await db.insert(schema.products).values([
    // Hardware
    {
      name: "Distar Heavy Duty Drill 20V",
      type: "product",
      description:
        "Brushless cordless drill with variable speeds and high torque. Durable for contractor usage.",
      price: 8999, // $89.99
      imageUrl:
        "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=600&q=80",
      orgId: hardwareOrgId,
      categoryId: hardwareCat.id,
    },
    {
      name: "Electric Concrete Mixer 200L",
      type: "product",
      description: "Heavy duty steel drum concrete mixer with direct-drive motor.",
      price: 24999, // $249.99
      imageUrl:
        "https://images.unsplash.com/photo-1581094288338-2314dddb7ecc?auto=format&fit=crop&w=600&q=80",
      orgId: hardwareOrgId,
      categoryId: hardwareCat.id,
    },
    {
      name: "Forged Steel Claw Hammer",
      type: "product",
      description: "One-piece solid steel claw hammer with anti-vibration grip.",
      price: 1999, // $19.99
      imageUrl:
        "https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?auto=format&fit=crop&w=600&q=80",
      orgId: hardwareOrgId,
      categoryId: hardwareCat.id,
    },

    // Plants
    {
      name: "Monstera Deliciosa (Swiss Cheese Plant)",
      type: "product",
      description:
        "Stunning indoor plant with split green leaves. Easy to care for and perfect for living rooms.",
      price: 2999, // $29.99
      imageUrl:
        "https://images.unsplash.com/photo-1614594975525-e45190c55d0b?auto=format&fit=crop&w=600&q=80",
      orgId: nurseryOrgId,
      categoryId: plantsCat.id,
    },
    {
      name: "Organic Heirloom Tomato Seeds Pack",
      type: "product",
      description: "Non-GMO organic cherry and beefsteak tomato seeds. High germination rate.",
      price: 349, // $3.49
      imageUrl:
        "https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?auto=format&fit=crop&w=600&q=80",
      orgId: nurseryOrgId,
      categoryId: plantsCat.id,
    },
    {
      name: "Ficus Lyrata (Fiddle Leaf Fig Tree)",
      type: "product",
      description: "Popular elegant indoor tree potted in premium organic soil mix.",
      price: 4500, // $45.00
      imageUrl:
        "https://images.unsplash.com/photo-1597055181300-e3633a207518?auto=format&fit=crop&w=600&q=80",
      orgId: nurseryOrgId,
      categoryId: plantsCat.id,
    },

    // Tech
    {
      name: "Distar Developer Workstation Pro",
      type: "product",
      description:
        "AMD Ryzen 9, 64GB DDR5 RAM, 2TB NVMe SSD, RTX 4500 GPU. Designed for deep learning and heavy builds.",
      price: 189900, // $1,899.00
      imageUrl:
        "https://images.unsplash.com/photo-1587831990711-23ca6441447b?auto=format&fit=crop&w=600&q=80",
      orgId: techOrgId,
      categoryId: techCat.id,
    },
    {
      name: "Industrial Secure IoT Gateway Hub",
      type: "product",
      description: "Hardware encrypted gateway router supporting Zigbee, Z-Wave, and LoRaWAN.",
      price: 12000, // $120.00
      imageUrl:
        "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80",
      orgId: techOrgId,
      categoryId: techCat.id,
    },

    // Expert Services
    {
      name: "Landscape & Garden Design Consultation",
      type: "service",
      description:
        "1-hour call or site visit with a master botanist to plan your indoor or outdoor garden layout.",
      price: 7500, // $75.00
      imageUrl:
        "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=600&q=80",
      orgId: servicesOrgId,
      categoryId: servicesCat.id,
    },
    {
      name: "Smart Irrigation & Sprinkler Setup",
      type: "service",
      description:
        "Full automated sprinkler layout setup linked to IoT gateway with remote weather tracking.",
      price: 15000, // $150.00
      imageUrl:
        "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=600&q=80",
      orgId: servicesOrgId,
      categoryId: servicesCat.id,
    },
  ]);

  console.log("✅ Database successfully seeded!");
  await client.end();
}

main().catch((err) => {
  console.error("❌ Database seed failed:", err);
  process.exit(1);
});
