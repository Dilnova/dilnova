import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const clerkSecretKey = process.env.CLERK_SECRET_KEY;
if (!clerkSecretKey) {
  console.error("CLERK_SECRET_KEY is missing in .env.local");
  process.exit(1);
}

async function checkOrg() {
  console.log("Checking Cargills Organization in Clerk...");
  try {
    const response = await fetch('https://api.clerk.com/v1/organizations/org_3E1yMwRYe3C1iBom2FbUiH4UcDs', {
      headers: {
        'Authorization': `Bearer ${clerkSecretKey}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Clerk returned status ${response.status}`);
    }
    
    const org = await response.json();
    console.log("----------------------------------------");
    console.log("Clerk Org Details:");
    console.log("ID:", org.id);
    console.log("Name:", org.name);
    console.log("Slug:", org.slug);
    console.log("Public Metadata:", org.public_metadata);
    console.log("----------------------------------------");
    console.log(`To view the storefront, use this URL path: /vendors/${org.slug || org.id}`);
  } catch (err) {
    console.error("Failed to check Clerk organization:", err);
  }
}

checkOrg();
