// Simple script to check Clerk org slugs via the REST API
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const secretKey = process.env.CLERK_SECRET_KEY;

fetch('https://api.clerk.dev/v1/organizations?limit=100', {
  headers: {
    'Authorization': `Bearer ${secretKey}`,
    'Content-Type': 'application/json',
  },
})
  .then(res => res.json())
  .then(data => {
    console.log('\n=== Organizations in Clerk ===\n');
    for (const org of data.data) {
      console.log(`  Name: ${org.name}`);
      console.log(`  Slug: ${org.slug}`);
      console.log(`  ID:   ${org.id}`);
      console.log('  ---');
    }
    console.log(`\nTotal: ${data.data.length} organizations`);
  })
  .catch(console.error);
