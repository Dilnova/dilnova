/**
 * One-time data cleanup migration: Remove duplicate default branches.
 *
 * The TOCTOU race condition in vendor-data.ts caused some organizations to accumulate
 * multiple "Main Register" (isDefault=true) branch rows. This script:
 *
 *   1. Finds all orgs with more than one default branch.
 *   2. For each org, keeps the OLDEST branch (earliest created_at) and deletes the rest.
 *   3. Reassigns any billing_receipts or simulated_orders referencing deleted branches
 *      to the surviving branch before deletion.
 *   4. Logs every action for audit traceability.
 *
 * Usage:
 *   pnpm tsx db/cleanup-duplicate-branches.ts
 *
 * Safe to run multiple times — it is fully idempotent.
 */

import * as dotenv from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";

dotenv.config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is missing in .env.local");
}

async function main() {
  const client = postgres(connectionString!, { prepare: false });
  const db = drizzle(client);

  console.log("🔍 Scanning for organizations with duplicate default branches...\n");

  // Step 1: Find all orgs that have more than one default branch
  const duplicateOrgs = await db.execute<{ org_id: string; branch_count: number }>(sql`
    SELECT org_id, COUNT(*) AS branch_count
    FROM branches
    WHERE is_default = true
    GROUP BY org_id
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC
  `);

  if (duplicateOrgs.length === 0) {
    console.log("✅ No duplicate default branches found. Database is clean.\n");
    await client.end();
    return;
  }

  console.log(
    `⚠️  Found ${duplicateOrgs.length} organization(s) with duplicate default branches:\n`,
  );
  for (const row of duplicateOrgs) {
    console.log(`   org_id: ${row.org_id}  →  ${row.branch_count} default branches`);
  }
  console.log("");

  let totalDeleted = 0;
  let totalReassigned = 0;

  for (const { org_id } of duplicateOrgs) {
    // Step 2: Get all default branches for this org, ordered by creation date (oldest first)
    const branches = await db.execute<{
      id: string;
      name: string;
      created_at: string;
    }>(sql`
      SELECT id, name, created_at
      FROM branches
      WHERE org_id = ${org_id} AND is_default = true
      ORDER BY created_at ASC
    `);

    const keeper = branches[0]; // Oldest branch survives
    const duplicates = branches.slice(1); // All others will be deleted
    const duplicateIds = duplicates.map((d) => d.id);

    console.log(`\n── Org: ${org_id} ──`);
    console.log(`   Keeping:   ${keeper.id} ("${keeper.name}", created ${keeper.created_at})`);
    for (const dup of duplicates) {
      console.log(`   Deleting:  ${dup.id} ("${dup.name}", created ${dup.created_at})`);
    }

    // Step 3: Reassign billing_receipts that reference duplicate branches
    for (const dupId of duplicateIds) {
      const receiptResult = await db.execute(sql`
        UPDATE billing_receipts
        SET branch_id = ${keeper.id}
        WHERE branch_id = ${dupId}
      `);
      const receiptCount = (receiptResult as unknown as { count?: number }).count ?? 0;
      if (receiptCount > 0) {
        console.log(
          `   ↳ Reassigned ${receiptCount} billing receipt(s) from ${dupId} → ${keeper.id}`,
        );
        totalReassigned += Number(receiptCount);
      }
    }

    // Step 4: Reassign simulated_orders that reference duplicate branches via pickup_branch_id
    for (const dupId of duplicateIds) {
      const orderResult = await db.execute(sql`
        UPDATE simulated_orders
        SET pickup_branch_id = ${keeper.id}
        WHERE pickup_branch_id = ${dupId}
      `);
      const orderCount = (orderResult as unknown as { count?: number }).count ?? 0;
      if (orderCount > 0) {
        console.log(`   ↳ Reassigned ${orderCount} order(s) from ${dupId} → ${keeper.id}`);
        totalReassigned += Number(orderCount);
      }
    }

    // Step 5: Reassign branch_inventory rows to the surviving branch
    for (const dupId of duplicateIds) {
      // Delete branch_inventory rows that would conflict (same product already exists in keeper branch)
      await db.execute(sql`
        DELETE FROM branch_inventory
        WHERE branch_id = ${dupId}
          AND product_id IN (
            SELECT product_id FROM branch_inventory WHERE branch_id = ${keeper.id}
          )
      `);
      // Move remaining branch_inventory rows to keeper
      await db.execute(sql`
        UPDATE branch_inventory
        SET branch_id = ${keeper.id}
        WHERE branch_id = ${dupId}
      `);
    }

    // Step 6: Reassign branch_members to the surviving branch
    for (const dupId of duplicateIds) {
      // Delete branch_members that would conflict (same user already exists in keeper branch)
      await db.execute(sql`
        DELETE FROM branch_members
        WHERE branch_id = ${dupId}
          AND member_user_id IN (
            SELECT member_user_id FROM branch_members WHERE branch_id = ${keeper.id}
          )
      `);
      // Move remaining branch_members to keeper
      await db.execute(sql`
        UPDATE branch_members
        SET branch_id = ${keeper.id}
        WHERE branch_id = ${dupId}
      `);
    }

    // Step 7: Delete the duplicate branches (CASCADE will clean up any remaining FK references)
    for (const dupId of duplicateIds) {
      await db.execute(sql`DELETE FROM branches WHERE id = ${dupId}`);
      totalDeleted++;
    }
  }

  console.log(`\n${"═".repeat(60)}`);
  console.log(`✅ Cleanup complete.`);
  console.log(`   Deleted:    ${totalDeleted} duplicate branch(es)`);
  console.log(`   Reassigned: ${totalReassigned} record(s)`);
  console.log(`   Affected:   ${duplicateOrgs.length} organization(s)`);
  console.log(`${"═".repeat(60)}\n`);

  await client.end();
}

main().catch((err) => {
  console.error("❌ Cleanup script failed:", err);
  process.exit(1);
});
