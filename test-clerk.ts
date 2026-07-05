import { clerkClient } from '@clerk/nextjs/server';
import 'dotenv/config';

async function main() {
  const client = await clerkClient();
  const orgs = await client.organizations.getOrganizationList({ limit: 1 });
  if (orgs.data.length > 0) {
    const org = orgs.data[0];
    const memberships = await client.organizations.getOrganizationMembershipList({ organizationId: org.id });
    console.log(JSON.stringify(memberships.data[0], null, 2));
  }
}
main();
