import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();
import { db } from '../shared/db/client';
import { sql } from 'drizzle-orm';
import { decryptString } from '../shared/security/encryption';

async function checkPii() {
  console.log('Checking PII_ENCRYPTION_KEY:', process.env.PII_ENCRYPTION_KEY ? 'Set' : 'Not Set');
  
  try {
    const res = await db.execute(sql`SELECT id, customer_name, customer_email FROM simulated_orders LIMIT 100`);
    const rows = res as any[];
    
    let successCount = 0;
    let failureCount = 0;
    
    for (const row of rows) {
      const encryptedEmail = row.customer_email;
      
      // If it's not encrypted (no v1/v2 prefix), skip it or count it.
      if (!encryptedEmail || (!encryptedEmail.startsWith('v1:') && !encryptedEmail.startsWith('v2:') && encryptedEmail.split(':').length !== 3)) {
        continue;
      }

      try {
        const decrypted = decryptString(encryptedEmail);
        if (decrypted === '[Decryption Failed]' || decrypted === encryptedEmail) {
          failureCount++;
          console.log(`Failed to decrypt order ${row.id}: ${encryptedEmail}`);
        } else {
          successCount++;
        }
      } catch (err) {
        failureCount++;
        console.log(`Failed to decrypt order ${row.id}: ${encryptedEmail} with error`, err);
      }
    }
    
    console.log(`\nChecked ${rows.length} rows.`);
    console.log(`Successfully decrypted: ${successCount}`);
    console.log(`Failed to decrypt: ${failureCount}`);
  } catch (err) {
    console.error('Database connection or query failed:', err);
  }
  
  process.exit(0);
}

checkPii();
