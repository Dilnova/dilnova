import { clerkClient } from '@clerk/nextjs/server';
import 'dotenv/config';

async function main() {
  const client = await clerkClient();
  const orgs = await client.organizations.getOrganizationList({ limit: 1 });
  if (orgs.data.length > 0) {
    const orgId = orgs.data[0].id;
    try {
        const membershipsResponse = await client.organizations.getOrganizationMembershipList({
            organizationId: orgId,
            limit: 100,
        });
        console.log("Success:", membershipsResponse.data.length);
    } catch(err) {
        console.error("CLERK ERROR:", err);
    }
  }
}
main();
