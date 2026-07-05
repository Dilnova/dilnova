import { clerkClient } from '@clerk/nextjs/server';
import 'dotenv/config';

async function main() {
  const client = await clerkClient();
  const orgs = await client.organizations.getOrganizationList({ limit: 1 });
  if (orgs.data.length > 0) {
    const org = orgs.data[0];
    const memberships = await client.organizations.getOrganizationMembershipList({ organizationId: org.id });
    const member = memberships.data[0];
    
    // try demote 
    try {
        await client.organizations.updateOrganizationMembership({
          organizationId: org.id,
          userId: member.publicUserData!.userId!,
          role: 'org:member',
        });
        console.log("Success update");
    } catch(err) {
        console.error("Error:", err);
    }
  }
}
main();
