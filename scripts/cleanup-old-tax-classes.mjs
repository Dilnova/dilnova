import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is missing from environment");
  process.exit(1);
}

const sql = postgres(connectionString, { prepare: false });

async function cleanupOldTaxClasses() {
  console.log("Cleaning up old / legacy tax classes from database...");

  // Fetch valid Sri Lanka VAT_STD id
  const [vatStd] = await sql`SELECT id FROM tax_classes WHERE code = 'VAT_STD' LIMIT 1;`;

  if (vatStd) {
    // Point any products, categories, org_settings referencing invalid tax classes to NULL or VAT_STD
    await sql`
      UPDATE products
      SET tax_class_id = NULL
      WHERE tax_class_id IN (SELECT id FROM tax_classes WHERE code NOT IN ('VAT_STD', 'SSCL', 'VAT_ZERO'));
    `;
    await sql`
      UPDATE categories
      SET tax_class_id = NULL
      WHERE tax_class_id IN (SELECT id FROM tax_classes WHERE code NOT IN ('VAT_STD', 'SSCL', 'VAT_ZERO'));
    `;
    await sql`
      UPDATE org_settings
      SET default_tax_class_id = NULL
      WHERE default_tax_class_id IN (SELECT id FROM tax_classes WHERE code NOT IN ('VAT_STD', 'SSCL', 'VAT_ZERO'));
    `;
  }

  // Delete any tax class that is not one of the official codes
  const deleted = await sql`
    DELETE FROM tax_classes
    WHERE code NOT IN ('VAT_STD', 'SSCL', 'VAT_ZERO')
    RETURNING *;
  `;

  console.log(`Deleted ${deleted.length} legacy tax class rows.`);

  // Print remaining active tax classes
  const remaining = await sql`
    SELECT id, code, name, rate_percent FROM tax_classes ORDER BY rate_percent DESC;
  `;
  console.log("Current Active Sri Lankan Tax Classes in Database:", remaining);

  await sql.end();
}

cleanupOldTaxClasses().catch((err) => {
  console.error("Failed to clean up old tax classes:", err);
  process.exit(1);
});
