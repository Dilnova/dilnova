import { clerkClient } from '@clerk/nextjs/server';

export async function getClerkUserIdByEmail(email: string): Promise<string | null> {
  const client = await clerkClient();
  const users = await client.users.getUserList({ emailAddress: [email] });
  return users.data[0]?.id ?? null;
}

/** First organization membership for a Clerk user (vendor E2E users should have exactly one). */
export async function getPrimaryOrgIdForEmail(email: string): Promise<string | null> {
  const userId = await getClerkUserIdByEmail(email);
  if (!userId) {
    return null;
  }

  const client = await clerkClient();
  const memberships = await client.users.getOrganizationMembershipList({ userId });
  return memberships.data[0]?.organization.id ?? null;
}

export async function getOrgRoleForEmail(email: string): Promise<string | null> {
  const userId = await getClerkUserIdByEmail(email);
  if (!userId) {
    return null;
  }

  const client = await clerkClient();
  const memberships = await client.users.getOrganizationMembershipList({ userId });
  return memberships.data[0]?.role ?? null;
}
