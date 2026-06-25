import * as dotenv from 'dotenv';
import { db } from '../shared/db/client';
import * as schema from '../shared/db/schema';
import { eq } from 'drizzle-orm';
import { decryptString, hashPii } from '../shared/security/encryption';

import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

// Load variables
dotenv.config({ path: '.env.local' });

async function backfill() {
  console.log('Starting PII hashes backfill...');

  const migrationUrl = process.env.MIGRATION_DATABASE_URL;
  if (migrationUrl) {
    console.log('Applying migration 0015 using MIGRATION_DATABASE_URL...');
    const migrationSql = postgres(migrationUrl);
    const sqlFile = fs.readFileSync(path.join(process.cwd(), 'drizzle/0015_demonic_nick_fury.sql'), 'utf8');
    const statements = sqlFile.split('--> statement-breakpoint').filter(s => s.trim() !== '');
    for (const stmt of statements) {
      try {
        await migrationSql.unsafe(stmt);
      } catch (err: any) {
        if (!err.message.includes('already exists')) {
          throw err;
        }
      }
    }
    await migrationSql.end();
    console.log('Migration applied successfully.');
  }

  // 1. Backfill simulated_orders
  console.log('Backfilling simulated_orders...');
  const allOrders = await db.select({ id: schema.simulatedOrders.id, customerEmail: schema.simulatedOrders.customerEmail }).from(schema.simulatedOrders);
  
  let ordersUpdated = 0;
  for (const order of allOrders) {
    if (order.customerEmail) {
      try {
        const decryptedEmail = decryptString(order.customerEmail);
        const emailHash = hashPii(decryptedEmail);
        
        await db.update(schema.simulatedOrders)
          .set({ customerEmailHash: emailHash })
          .where(eq(schema.simulatedOrders.id, order.id));
          
        ordersUpdated++;
      } catch (err) {
        console.error(`Failed to backfill order ${order.id}:`, err);
      }
    }
  }
  console.log(`Updated ${ordersUpdated} simulated_orders.`);

  // 2. Backfill contact_submissions
  console.log('Backfilling contact_submissions...');
  const allSubmissions = await db.select({ id: schema.contactSubmissions.id, email: schema.contactSubmissions.email }).from(schema.contactSubmissions);
  
  let submissionsUpdated = 0;
  for (const sub of allSubmissions) {
    if (sub.email) {
      try {
        const decryptedEmail = decryptString(sub.email);
        const emailHash = hashPii(decryptedEmail);
        
        await db.update(schema.contactSubmissions)
          .set({ emailHash })
          .where(eq(schema.contactSubmissions.id, sub.id));
          
        submissionsUpdated++;
      } catch (err) {
        console.error(`Failed to backfill submission ${sub.id}:`, err);
      }
    }
  }
  console.log(`Updated ${submissionsUpdated} contact_submissions.`);
  
  console.log('Backfill complete!');
  process.exit(0);
}

backfill().catch(err => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
