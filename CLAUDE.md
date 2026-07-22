# CLAUDE.md Developer Guide

This file provides quick-reference commands, architecture details, and coding conventions for the Dilnova project.

## 🛠️ Build & Verification Commands

- **Start Dev Server**: `pnpm dev`
- **Compile / Build Production Bundle**: `pnpm build`
- **Run Unit Tests**: `pnpm test`
- **Run Linter**: `pnpm lint`
- **Run TypeScript Typecheck**: `pnpm tsc --noEmit`

---

## ⚙️ Development Guidelines & Style Conventions

### 1. Multi-Tenant Authorization & RBAC

- **Context Isolation**: Always retrieve `orgId` from Clerk's `auth()` inside pages and server actions to segregate and filter data records.
- **Role Protection**:
  - **Admins (`org:admin`)**: Only admins can access catalog management (`/vendor/products`), adjust suppliers, assign branch cashiers, and view/modify memberships on the `/vendor` console.
  - **Members (`org:member`)**: Permitted to run **POS Register** (`/vendor/billing`) and **+ Add Item** listings (`/vendor/products/add`), but blocked from catalog management dashboard.
  - **Actions Security**: Always duplicate role validation checks at the Server Action level (`addProductAction`, `deleteProductAction`, etc.) using `auth()`.

### 2. Code Conventions

- **Next.js 16+ Middleware / Proxy**: Starting in Next.js 16, `middleware.ts` has been officially deprecated and replaced by the new `proxy.ts` convention. They are functionally similar, but the name `proxy` clarifies its purpose as a routing and network boundary layer rather than a place to chain heavy business logic. **Use `proxy.ts` instead of `middleware.ts`.**
- **Type Safety**: Strictly avoid using `any`. Ensure proper TypeScript annotations for all component properties, forms, and database rows.
- **Forms & Validation**: Use `zod` schemas located in `@/utils/schemas` to validate payloads on all server action calls.
- **Data Layer**: Access the database using Drizzle ORM. Condition all operations on `orgId` to prevent cross-tenant exposure.
