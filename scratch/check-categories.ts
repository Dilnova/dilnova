import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../db/schema';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL not found");
  process.exit(1);
}

const client = postgres(connectionString, { prepare: false });
const db = drizzle(client, { schema });

interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  children: CategoryNode[];
}

async function checkCategories() {
  console.log("🔍 Fetching seeded categories from database...");
  const categories = await db.select().from(schema.categories);
  
  console.log(`Found ${categories.length} total categories in database.`);

  // Build parent map
  const nodesMap: Record<string, CategoryNode> = {};
  const rootNodes: CategoryNode[] = [];

  // Initialize nodes
  categories.forEach(cat => {
    nodesMap[cat.id] = {
      id: cat.id,
      name: (cat.localizedNames as Record<string, string> | null)?.en || cat.name || cat.slug,
      slug: cat.slug,
      children: []
    };
  });

  // Link children to parents
  categories.forEach(cat => {
    const node = nodesMap[cat.id];
    if (cat.parentId && nodesMap[cat.parentId]) {
      nodesMap[cat.parentId].children.push(node);
    } else {
      rootNodes.push(node);
    }
  });

  // Print tree structure recursively
  function printTree(node: CategoryNode, prefix = "") {
    console.log(`${prefix}📂 ${node.name} (${node.slug})`);
    node.children.forEach((child, index) => {
      const isLast = index === node.children.length - 1;
      const childPrefix = prefix + (isLast ? "    " : "│   ");
      printTree(child, prefix + (isLast ? "└── " : "├── "));
    });
  }

  console.log("\n--- Category Taxonomy Tree ---");
  rootNodes.forEach(root => printTree(root));
  
  await client.end();
}

checkCategories().catch(err => {
  console.error("Failed to read categories:", err);
  process.exit(1);
});
