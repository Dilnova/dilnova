import 'dotenv/config';
import { db } from '../shared/db/client';
import { simulatedOrders } from '../shared/db/schema/orders';
import { contactSubmissions } from '../shared/db/schema/platform';
import { suppliers } from '../shared/db/schema/inventory';
import { billingReceipts, branches } from '../shared/db/schema/billing';
import { reviews, questions } from '../shared/db/schema/catalog';
import { decryptString } from '../shared/security/encryption';
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

    // 3. Process suppliers
    console.log('\nScanning suppliers...');
    const staleSuppliers = await db.execute(sql`
      SELECT id, contact_name, email, phone, address
      FROM suppliers
      WHERE (contact_name IS NOT NULL AND contact_name NOT LIKE 'v2:%')
         OR (email IS NOT NULL AND email NOT LIKE 'v2:%')
         OR (phone IS NOT NULL AND phone NOT LIKE 'v2:%')
         OR (address IS NOT NULL AND address NOT LIKE 'v2:%')
    `);

    console.log(`Found ${staleSuppliers.length} supplier(s) requiring re-encryption.`);
    let updatedSuppliersCount = 0;

    for (const row of staleSuppliers) {
      const id = row.id as string;
      const rawContactName = row.contact_name as string | null;
      const rawEmail = row.email as string | null;
      const rawPhone = row.phone as string | null;
      const rawAddress = row.address as string | null;

      await db.update(suppliers)
        .set({
          contactName: rawContactName ? decryptString(rawContactName) : null,
          email: rawEmail ? decryptString(rawEmail) : null,
          phone: rawPhone ? decryptString(rawPhone) : null,
          address: rawAddress ? decryptString(rawAddress) : null,
        })
        .where(eq(suppliers.id, id));

      updatedSuppliersCount++;
    }
    console.log(`Successfully updated ${updatedSuppliersCount} supplier(s).`);

    // 4. Process billing_receipts
    console.log('\nScanning billing_receipts...');
    const staleReceipts = await db.execute(sql`
      SELECT id, customer_name
      FROM billing_receipts
      WHERE (customer_name IS NOT NULL AND customer_name NOT LIKE 'v2:%')
    `);

    console.log(`Found ${staleReceipts.length} billing receipt(s) requiring re-encryption.`);
    let updatedReceiptsCount = 0;

    for (const row of staleReceipts) {
      const id = row.id as string;
      const rawCustomerName = row.customer_name as string | null;

      await db.update(billingReceipts)
        .set({
          customerName: rawCustomerName ? decryptString(rawCustomerName) : null,
        })
        .where(eq(billingReceipts.id, id));

      updatedReceiptsCount++;
    }
    console.log(`Successfully updated ${updatedReceiptsCount} billing receipt(s).`);

    // 5. Process branches
    console.log('\nScanning branches...');
    const staleBranches = await db.execute(sql`
      SELECT id, address, phone
      FROM branches
      WHERE (address IS NOT NULL AND address NOT LIKE 'v2:%')
         OR (phone IS NOT NULL AND phone NOT LIKE 'v2:%')
    `);

    console.log(`Found ${staleBranches.length} branch(es) requiring re-encryption.`);
    let updatedBranchesCount = 0;

    for (const row of staleBranches) {
      const id = row.id as string;
      const rawAddress = row.address as string | null;
      const rawPhone = row.phone as string | null;

      await db.update(branches)
        .set({
          address: rawAddress ? decryptString(rawAddress) : null,
          phone: rawPhone ? decryptString(rawPhone) : null,
        })
        .where(eq(branches.id, id));

      updatedBranchesCount++;
    }
    console.log(`Successfully updated ${updatedBranchesCount} branch(es).`);

    // 6. Process reviews
    console.log('\nScanning reviews...');
    const staleReviews = await db.execute(sql`
      SELECT id, user_name
      FROM reviews
      WHERE (user_name IS NOT NULL AND user_name NOT LIKE 'v2:%')
    `);

    console.log(`Found ${staleReviews.length} review(s) requiring re-encryption.`);
    let updatedReviewsCount = 0;

    for (const row of staleReviews) {
      const id = row.id as string;
      const rawUserName = row.user_name as string;

      await db.update(reviews)
        .set({
          userName: rawUserName ? decryptString(rawUserName) : rawUserName,
        })
        .where(eq(reviews.id, id));

      updatedReviewsCount++;
    }
    console.log(`Successfully updated ${updatedReviewsCount} review(s).`);

    // 7. Process questions
    console.log('\nScanning questions...');
    const staleQuestions = await db.execute(sql`
      SELECT id, user_name
      FROM questions
      WHERE (user_name IS NOT NULL AND user_name NOT LIKE 'v2:%')
    `);

    console.log(`Found ${staleQuestions.length} question(s) requiring re-encryption.`);
    let updatedQuestionsCount = 0;

    for (const row of staleQuestions) {
      const id = row.id as string;
      const rawUserName = row.user_name as string;

      await db.update(questions)
        .set({
          userName: rawUserName ? decryptString(rawUserName) : rawUserName,
        })
        .where(eq(questions.id, id));

      updatedQuestionsCount++;
    }
    console.log(`Successfully updated ${updatedQuestionsCount} question(s).`);

    console.log('\nPII Key Rotation Completed successfully.');
  } catch (error) {
    console.error('Error executing key rotation:', error);
    process.exit(1);
  }
}

main();
