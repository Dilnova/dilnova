import 'dotenv/config';
import { db } from '../shared/db/client';
import { simulatedOrders } from '../shared/db/schema/orders';
import { contactSubmissions } from '../shared/db/schema/platform';
import { decryptString, encryptString } from '../shared/security/encryption';
import { sql, eq } from 'drizzle-orm';

async function main() {
  console.log('=== PII Key Rotation Script ===');

  const activeKey = process.env.PII_ENCRYPTION_KEY?.trim();
  const fallbackKey = process.env.PII_ENCRYPTION_KEY_V1?.trim();

  if (!activeKey) {
    console.error('Error: PII_ENCRYPTION_KEY is not defined.');
    process.exit(1);
  }

  if (!fallbackKey) {
    console.warn('Warning: PII_ENCRYPTION_KEY_V1 is not set.');
    console.warn('This script will attempt to decrypt older records using the active PII_ENCRYPTION_KEY.');
    console.warn('If you have changed the key value, please set PII_ENCRYPTION_KEY_V1 to the old key.');
    console.log();
  }

  try {
    // 1. Process simulated_orders
    console.log('Scanning simulated_orders...');
    const staleOrders = await db.execute(sql`
      SELECT id, customer_name, customer_email, shipping_address, shipping_phone
      FROM simulated_orders
      WHERE (customer_name IS NOT NULL AND customer_name NOT LIKE 'v2:%')
         OR (customer_email IS NOT NULL AND customer_email NOT LIKE 'v2:%')
         OR (shipping_address IS NOT NULL AND shipping_address NOT LIKE 'v2:%')
         OR (shipping_phone IS NOT NULL AND shipping_phone NOT LIKE 'v2:%')
    `);

    console.log(`Found ${staleOrders.length} order(s) requiring re-encryption.`);
    let updatedOrdersCount = 0;

    for (const row of staleOrders) {
      const id = row.id as string;
      const rawName = row.customer_name as string | null;
      const rawEmail = row.customer_email as string | null;
      const rawAddress = row.shipping_address as string | null;
      const rawPhone = row.shipping_phone as string | null;

      const decryptedName = rawName ? decryptString(rawName) : null;
      const decryptedEmail = rawEmail ? decryptString(rawEmail) : null;
      const decryptedAddress = rawAddress ? decryptString(rawAddress) : null;
      const decryptedPhone = rawPhone ? decryptString(rawPhone) : null;

      // Drizzle update will automatically invoke customType's toDriver() (which runs encryptString and uses v2 prefix)
      await db.update(simulatedOrders)
        .set({
          customerName: decryptedName ?? undefined,
          customerEmail: decryptedEmail ?? undefined,
          shippingAddress: decryptedAddress,
          shippingPhone: decryptedPhone,
        })
        .where(eq(simulatedOrders.id, id));

      updatedOrdersCount++;
    }
    console.log(`Successfully updated ${updatedOrdersCount} order(s).`);

    // 2. Process contact_submissions
    console.log('\nScanning contact_submissions...');
    const staleSubmissions = await db.execute(sql`
      SELECT id, name, email
      FROM contact_submissions
      WHERE (name IS NOT NULL AND name NOT LIKE 'v2:%')
         OR (email IS NOT NULL AND email NOT LIKE 'v2:%')
    `);

    console.log(`Found ${staleSubmissions.length} contact submission(s) requiring re-encryption.`);
    let updatedSubmissionsCount = 0;

    for (const row of staleSubmissions) {
      const id = row.id as string;
      const rawName = row.name as string | null;
      const rawEmail = row.email as string | null;

      const decryptedName = rawName ? decryptString(rawName) : null;
      const decryptedEmail = rawEmail ? decryptString(rawEmail) : null;

      await db.update(contactSubmissions)
        .set({
          name: decryptedName ?? undefined,
          email: decryptedEmail ?? undefined,
        })
        .where(eq(contactSubmissions.id, id));

      updatedSubmissionsCount++;
    }
    console.log(`Successfully updated ${updatedSubmissionsCount} contact submission(s).`);
    console.log('\nPII Key Rotation Completed successfully.');
  } catch (error) {
    console.error('Error executing key rotation:', error);
    process.exit(1);
  }
}

main();
