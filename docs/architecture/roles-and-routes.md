# Roles and routes

Route-level guards live in `app/(group)/layout.tsx`. Every mutation must re-check in the server action.

| Route | Guard | Clerk role |
|-------|-------|------------|
| `/`, `/products`, `/vendors`, `/cart`, `/contact` | Public (`proxy.ts`) | Guest OK |
| `/customer/*` | `(customer)/layout.tsx` | Signed-in user |
| `/vendor/*` | `(vendor)/layout.tsx` | `org:admin` or `org:member` + active org |
| `/admin` | `(admin)/layout.tsx` | `org:admin` + active org |
| `/superadmin` | `(superadmin)/layout.tsx` | User `publicMetadata.role === 'admin'` |

## org:member vs org:admin (vendor)

| Action | Member | Admin |
|--------|--------|-------|
| Add product (`/vendor/products/add`) | ✅ | ✅ |
| Delete product | ❌ | ✅ |
| Manage orders (verify/reject/cancel) | ❌ | ✅ |
| Vendor profile / bank / checkout options | ❌ | ✅ |
| Branch CRUD / assign cashiers | ❌ | ✅ |
| POS billing | ✅ (branch-assigned if multi-branch) | ✅ |

## Superadmin

Global console at `/superadmin`. All actions use `checkSuperAdmin()` from `@/shared/auth/superadmin-guard`.

Vendor org integrity tooling: `@/features/vendor-org`.

## Testing

See QA plan: test layout denial + direct server action calls (UI hiding is not enough).
