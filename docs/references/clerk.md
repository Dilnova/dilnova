# Clerk — Official Reference

> **Version in use**: `@clerk/nextjs ^7.3.0`
> **Official docs**: https://clerk.com/docs

---

## Key Docs Links

| Topic                            | URL                                                                  |
| -------------------------------- | -------------------------------------------------------------------- |
| Next.js Quickstart               | https://clerk.com/docs/quickstarts/nextjs                            |
| Middleware (`clerkMiddleware`)   | https://clerk.com/docs/references/nextjs/clerk-middleware            |
| `auth()` Server Helper           | https://clerk.com/docs/references/nextjs/auth                        |
| `currentUser()`                  | https://clerk.com/docs/references/nextjs/current-user                |
| Organizations                    | https://clerk.com/docs/organizations/overview                        |
| Organization Roles & Permissions | https://clerk.com/docs/organizations/roles-permissions               |
| User Metadata                    | https://clerk.com/docs/users/metadata                                |
| `<SignIn />` Component           | https://clerk.com/docs/components/authentication/sign-in             |
| `<UserButton />` Component       | https://clerk.com/docs/components/user/user-button                   |
| `<OrganizationSwitcher />`       | https://clerk.com/docs/components/organization/organization-switcher |
| Webhooks                         | https://clerk.com/docs/webhooks/overview                             |
| Testing                          | https://clerk.com/docs/testing/overview                              |
| Security Overview                | https://clerk.com/docs/security/overview                             |
| Backend API                      | https://clerk.com/docs/reference/backend-api                         |

---

## How Dilnova Uses Clerk

### RBAC Structure (3 Layers)

1. **Superadmin** — `publicMetadata.role === "admin"` (user-level)
2. **Org Admin** — `org:admin` (organization role)
3. **Org Member** — `org:member` (organization role)

### Key Integration Points

- **Middleware**: `clerkMiddleware()` in `middleware.ts` protects all routes
- **Server Actions**: `auth()` for userId/orgId in every server action
- **Organization Context**: `orgId` used as tenant isolation key across all queries
- **Metadata Migrations**: Scripts in `scripts/migrate-*-metadata.mjs`

### Common Patterns

```ts
// Server-side auth check
import { auth } from "@clerk/nextjs/server";

export async function protectedAction() {
  const { userId, orgId, orgRole } = await auth();
  if (!userId) throw new Error("Unauthorized");
  if (orgRole !== "org:admin") throw new Error("Forbidden");
}
```

```ts
// Superadmin check
import { currentUser } from "@clerk/nextjs/server";

const user = await currentUser();
const isSuperadmin = user?.publicMetadata?.role === "admin";
```

### Security Model & Caching

To reduce Clerk API rate limits and latency, role and organization checks are cached using Next.js `unstable_cache` (`shared/auth/clerk-cache.ts`):

- **User Global Role Cache (`getCachedUserRole`)**: 15 seconds TTL
- **Superadmin Cache (`getCachedIsSuperAdmin`)**: 15 seconds TTL
- **Organization Members Cache (`getCachedOrgMembers`)**: 60 seconds TTL (reduced from 300s to limit access windows)

**Important**: Because of these cache windows, a revoked admin or removed organization member may retain access for up to 15 seconds (for global roles) or 60 seconds (for org roles).

**Best Practice**: For critical operations (e.g., financial transactions, billing changes, payouts), **bypass the cache** and make a fresh Clerk API call (e.g. `client.users.getUser(userId)`) to verify the user's role and membership in real-time.

### Account Enumeration Protection (Dashboard Setting)

- **Finding (M1)**: The `<SignIn />` and `<SignUp />` prebuilt components (`app/sign-in/[[...sign-in]]/page.tsx` and `app/sign-up/[[...sign-up]]/AgeGatedSignUp.tsx`) rely on Clerk's tenant security configuration to prevent account enumeration.
- **Protection Modes**:
  1. **Bulk user enumeration protection** (Default/Basic): Uses IP rate limiting to prevent high-volume automated harvesting of accounts. However, targeted individual lookups remain possible.
  2. **Strict user enumeration protection** (Recommended): Alters sign-in and sign-up application logic to ensure no response or error message reveals whether a single email or phone number is registered.
- **Recommended Action**:
  1. Log into the [Clerk Dashboard](https://dashboard.clerk.com).
  2. Select your environment (Development / Production).
  3. Navigate to **Security** > **User Enumeration Protection** (or **Attack Protection**).
  4. Select **Strict user enumeration protection**.

---

## Environment Variables

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```
