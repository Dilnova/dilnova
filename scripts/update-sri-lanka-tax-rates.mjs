import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is missing from environment");
  process.exit(1);
}

const sql = postgres(connectionString, { prepare: false });

async function updateTaxRates() {
  console.log(
    "Updating Tax Classes to Sri Lankan Tax Standard (VAT 18%, SSCL 2.5%, Zero Rated 0%)...",
  );

  // Update existing VAT_STD row to 18%
  const updatedStd = await sql`
    UPDATE tax_classes
    SET name = 'Sri Lanka Standard VAT (18%)', rate_percent = 18.0
    WHERE code = 'VAT_STD' OR code = 'STANDARD'
    RETURNING *;
  `;
  console.log("Updated VAT_STD / STANDARD rows:", updatedStd);

  // Update existing VAT_RED or SSCL row to 2.5%
  const updatedSscl = await sql`
    UPDATE tax_classes
    SET name = 'Social Security Levy - SSCL (2.5%)', rate_percent = 2.5, code = 'SSCL'
    WHERE code = 'VAT_RED' OR code = 'SSCL'
    RETURNING *;
  `;
  console.log("Updated SSCL rows:", updatedSscl);

  // Update VAT_ZERO row to 0%
  const updatedZero = await sql`
    UPDATE tax_classes
    SET name = 'Exempt / Zero Rated (0%)', rate_percent = 0.0
    WHERE code = 'VAT_ZERO' OR code = 'ZERO'
    RETURNING *;
  `;
  console.log("Updated VAT_ZERO / ZERO rows:", updatedZero);

  console.log("Tax classes updated successfully!");
  await sql.end();
}

updateTaxRates().catch((err) => {
  console.error("Failed to update tax rates:", err);
  process.exit(1);
});
