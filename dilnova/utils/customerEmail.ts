import type { User } from '@clerk/nextjs/server';

/** Normalize customer emails for storage and lookup (trim + lowercase). */
export function normalizeCustomerEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Prefer Clerk primary email; fall back to first address on the account. */
export function getClerkUserEmail(user: User): string {
  return (
    user.primaryEmailAddress?.emailAddress ||
    user.emailAddresses[0]?.emailAddress ||
    ''
  );
}

/** Normalized email suitable for order storage and portal queries. */
export function getNormalizedClerkUserEmail(user: User): string {
  const raw = getClerkUserEmail(user);
  return raw ? normalizeCustomerEmail(raw) : '';
}
