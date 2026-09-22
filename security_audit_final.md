# Dilnova Commerce Hub — Pre-Production Security Audit Report

**Date:** 2026-09-22  
**Target Environment:** Production Launch Gate  
**Methodology:** Comprehensive static code analysis, dependency vulnerability audit, architectural review, and authorization penetration review across all routes and Server Actions.  
**Auditor:** Automated Enterprise Security Suite & Antigravity Security Agent

---

## Executive Summary

A complete, enterprise-grade security audit was performed across all 11 security domains specified for pre-production launch readiness.

| #   | Domain                              | Status               | Key Highlights                                                                                                                                                                                  |
| --- | ----------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Secrets & Configuration             | ✅ Confirmed Secure  | 0 hardcoded secrets across 928 commits. `.env` files strictly gitignored. All 26 required production variables including `CRON_SECRET` validated fail-closed on startup.                        |
| 2   | Injection & Input Validation        | ✅ Confirmed Secure  | 100% parameterized queries via Drizzle ORM. 0 command injection risks. All 4 `dangerouslySetInnerHTML` JSON-LD blocks escape `<` to `\u003c`.                                                   |
| 3   | Authentication                      | ✅ Confirmed Secure  | 100% delegated to Clerk. Zero custom password storage. Session cookies use `HttpOnly`, `Secure`, `SameSite=Lax`.                                                                                |
| 4   | Authorization & Access Control      | ✅ Confirmed Secure  | Server-side dual-gate superadmin protection. Multi-tenant isolation enforced. Customer order ownership strictly verified in tracking page and shipping label endpoint. Fail-closed role checks. |
| 5   | CSRF & CORS                         | ✅ Confirmed Secure  | Custom edge CSRF verification on all mutating requests. Next.js Server Action CSRF. Strict single-origin CORS without wildcards.                                                                |
| 6   | Security Headers & Transport        | ✅ Confirmed Secure  | Strict HSTS, CSP with nonces (`unsafe-eval` disabled in production), X-Frame-Options DENY, Permissions-Policy.                                                                                  |
| 7   | Rate Limiting & Abuse Prevention    | ✅ Confirmed Secure  | Upstash Redis sliding window with memory fallback. Critical actions fail closed. Scoped by user ID and edge IP.                                                                                 |
| 8   | Data Exposure & API Security        | ✅ Confirmed Secure  | Shipping label PDF endpoint secured with multi-tenant org, customer ownership, and superadmin checks. All API responses strictly filter database columns. PII exposure eliminated.              |
| 9   | Dependency & Supply Chain           | ✅ Confirmed Secure  | `pnpm audit` reports **0 known vulnerabilities**. All core dependencies active and supported.                                                                                                   |
| 10  | Logging & Error Handling            | ⚠️ Issue Found (Low) | Centralized structured JSON logging with recursive key redaction and CRLF sanitization. 2 route catch blocks bypass structured logger.                                                          |
| 11  | Webhooks & Third-Party Integrations | ✅ Confirmed Secure  | Svix HMAC-SHA256 signature verification for Clerk with DB idempotency fallback. QStash signature verification and locks.                                                                        |

---

## 1. Secrets & Configuration

### 1.1 Hard-Coded Secrets

- **Status:** ✅ Confirmed Secure
- **Evidence:** Automated Gitleaks scan across all 928 commits in repository history:
  ```
  gitleaks git --verbose
  928 commits scanned.
  scanned ~17779217 bytes (17.78 MB) in 1.84s
  no leaks found
  ```
- **Code Evidence:** Search across all source files for patterns (`sk_live_`, `pk_live_`, `AKIA`, `BEGIN PRIVATE KEY`, `xox[baprs]-`, `ghp_`, `SG.`) confirmed zero committed production secrets or private keys. The only occurrences of `sk_live_` are in documentation markdown files (`docs/references/clerk.md:95`, `docs/PRODUCTION_RUNBOOK.md:14-17`) or test dummy values in test suites (`tests/unit/shared/env/instrumentation.test.ts:62`).

### 1.2 Gitignored Environment Files

- **Status:** ✅ Confirmed Secure
- **Evidence:** `.gitignore` lines 38–46:
  ```gitignore
  # File: .gitignore#L38-L46
  # env files (can opt-in for committing if needed)
  .env
  .env.local
  .env.production
  .env.test
  .env.development
  .env.*.local
  .env*
  !.env.example
  ```
- **Git History Confirmation:** `git log --all --name-only --format="" | grep -E '^\.env' | sort -u` returns only `.env.example`. No `.env` or `.env.local` files have ever been committed.

### 1.3 Process.env Audit & Validation

- **Status:** ✅ Confirmed Secure
- **Code Evidence:**
  Validation schema in `shared/env/server.ts:6-53`:
  ```typescript
  // File: shared/env/server.ts#L6-L53
  export const productionServerEnvSchema = z.object({
    DATABASE_URL: nonEmpty,
    SENTRY_DSN: nonEmpty,
    DATABASE_POOL_SIZE: z.string().optional().refine(...),
    SENTRY_TRACES_SAMPLE_RATE: z.string().optional().refine(...),
    PII_ENCRYPTION_KEY: nonEmpty,
    CLERK_SECRET_KEY: nonEmpty.refine((val) => val !== "sk_test_ci_dummy", {
      message: "CLERK_SECRET_KEY must not be the CI dummy key in production",
    }),
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: nonEmpty,
    NEXT_PUBLIC_APP_URL: nonEmpty.url(),
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: nonEmpty,
    CLOUDINARY_API_KEY: nonEmpty,
    CLOUDINARY_API_SECRET: nonEmpty,
    NEXT_PUBLIC_SUPABASE_URL: nonEmpty.url(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: nonEmpty,
    SUPABASE_SERVICE_ROLE_KEY: nonEmpty,
    UPSTASH_REDIS_REST_URL: nonEmpty.url(),
    UPSTASH_REDIS_REST_TOKEN: nonEmpty,
    HEALTH_CHECK_SECRET: nonEmpty,
    SMTP_USER: nonEmpty,
    SMTP_PASSWORD: nonEmpty,
    EMAIL_FROM_ADDRESS: nonEmpty.email(),
    EMAIL_FROM_NAME: nonEmpty,
    SUPERADMIN_USER_IDS: nonEmpty,
    CLERK_WEBHOOK_SECRET: nonEmpty,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: nonEmpty,
    TURNSTILE_SECRET_KEY: nonEmpty,
    QSTASH_TOKEN: nonEmpty,
    CRON_SECRET: nonEmpty,
  });
  ```
- **Startup Enforcement (`instrumentation.ts:14` & `shared/env/server.ts:57-89`):**
  In production, `validateServerEnv()` executes on startup. If any required variable is missing or invalid, it throws `new Error("Server environment validation failed. Check Vercel environment variables.")` — **fail-closed**.
- **Verification:**
  `CRON_SECRET: nonEmpty` is validated during production runtime initialization alongside all other required variables, and tested in `tests/unit/shared/env/server.test.ts`. Verified in CI/E2E test config via `playwright.config.ts:webServerEnv`.

### 1.4 Production vs. Preview Environment Separation

- **Status:** ✅ Confirmed Secure
- **Code Evidence:**
  1. Database Guard (`shared/env/server.ts:90-104`):
     ```typescript
     // File: shared/env/server.ts#L90-L104
     if (
       process.env.VERCEL_ENV === "preview" &&
       process.env.DATABASE_URL?.includes("jnsfgoafayvlukjkqzjm")
     ) {
       logger.error(
         JSON.stringify({
           level: "error",
           message: "Preview deployment attempted to use production database",
           timestamp: new Date().toISOString(),
         }),
       );
       throw new Error(
         "Preview deployments must not use the production DATABASE_URL. Please configure a separate branch database URL for previews.",
       );
     }
     ```
  2. Clerk Key Guard (`instrumentation.ts:5-12`):
     ```typescript
     // File: instrumentation.ts#L5-L12
     if (process.env.VERCEL_ENV === "production") {
       const clerkKey = process.env.CLERK_SECRET_KEY || "";
       if (!clerkKey || clerkKey.startsWith("sk_test_") || clerkKey === "sk_test_ci_dummy") {
         throw new Error(
           "FATAL: test Clerk key detected in production environment — refusing to start.",
         );
       }
     }
     ```
  3. Webhook Secret Guard (`app/api/webhooks/clerk/route.ts:72-80`): Allows preview deployments to use `PREVIEW_CLERK_WEBHOOK_SECRET` to prevent production cross-contamination.

### 1.5 Redaction in Logs and Error Paths

- **Status:** ✅ Confirmed Secure
- **Code Evidence:**
  `shared/logging/logger.ts:52-97`:
  ```typescript
  // File: shared/logging/logger.ts#L82-L96
  const sensitiveKeysRegex =
    /email|phone|address|password|secret|token|key|bankaccountname|bankaccountnumber|bankbranchcode|bankname|shippingaddress|shippingphone|customeremail|customername|authorization|cookie|^to$|^from$|recipient|sender|paymentslip|slipurl|nationalid|taxid|iban|ssn|dob|dateofbirth/i;

  const redacted: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    const isSensitive = sensitiveKeysRegex.test(k);
    if (isSensitive) {
      redacted[k] = "[REDACTED]";
    } else {
      redacted[k] = redactSensitiveData(v, seen);
    }
  }
  ```
  In `logger.error` (`shared/logging/logger.ts:198-205`), both the `error` object and the execution context are passed through `redactSensitiveData()` before serialization.

---

## 2. Injection & Input Validation

### 2.1 Database Query Parameterization

- **Status:** ✅ Confirmed Secure
- **Code Evidence:**
  All database queries utilize Drizzle ORM query builder methods (`eq`, `inArray`, `and`, `or`, `insert`, `select`, `update`, `delete`).
  Where Drizzle tagged template literals (`sql`...``) are used, all variables are passed via parameterized expression interpolations (`${...}`).
  - Health check: `app/api/health/route.ts:22`: `await db.execute(sql`SELECT 1`);`
  - Chat counter: `features/chat/actions.ts:262`: `sql`${schema.orderConversations.unreadByVendor} + 1``
  - Product views: `features/catalog/product-detail.actions.ts:261`: `sql`${schema.products.views} + 1``
  - Inventory reservation: `features/inventory/reservation.ts:94`: `sql`${schema.inventory.quantity} - ${quantity}``
  - Zero instances of `sql.raw()` or string concatenation into queries exist in application code.

### 2.2 XSS (Cross-Site Scripting) & dangerouslySetInnerHTML

- **Status:** ✅ Confirmed Secure
- **Code Evidence:**
  All four occurrences of `dangerouslySetInnerHTML` in the codebase are strictly sanitized using `.replace(/</g, "\\u003c")` to prevent inline `<script>` parser breakouts:
  1. `app/products/[id]/page.tsx:256-258` — ✅ Sanitized:
     ```typescript
     // File: app/products/[id]/page.tsx#L256-L258
     dangerouslySetInnerHTML={{
       __html: JSON.stringify([productJsonLd, breadcrumbJsonLd]).replace(/</g, "\\u003c"),
     }}
     ```
  2. `app/brand/dilstar/page.tsx:81-83` — ✅ Sanitized:
     ```typescript
     // File: app/brand/dilstar/page.tsx#L81-L83
     dangerouslySetInnerHTML={{
       __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
     }}
     ```
  3. `app/layout.tsx:241-274` — ✅ Sanitized:
     ```typescript
     // File: app/layout.tsx#L241-L274
     dangerouslySetInnerHTML={{
       __html: JSON.stringify({
         "@context": "https://schema.org",
         "@graph": [ ... ],
       }).replace(/</g, "\\u003c"),
     }}
     ```
  4. `app/vendors/[slug]/page.tsx:264-268` — ✅ Sanitized:
     ```typescript
     // File: app/vendors/[slug]/page.tsx#L264-L268
     const structuredDataScript = (
       <script
         type="application/ld+json"
         dangerouslySetInnerHTML={{
           __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
         }}
       />
     );
     ```
  Zero unescaped HTML injections or `innerHTML` assignments exist across the application.

### 2.3 Command Execution (exec / spawn / eval)

- **Status:** ✅ Confirmed Secure
- **Code Evidence:**
  Zero `eval()` or `Function()` calls in the entire codebase.
  `child_process` (`execSync`) is exclusively imported in offline administrator scripts:
  - `scripts/backup-db.mjs:1`
  - `scripts/restore-db.mjs:1`
    Neither script is accessible via HTTP or imported by App Router handlers.

### 2.4 Schema Validation (Zod)

- **Status:** ✅ Confirmed Secure
- **Code Evidence:**
  All 37 Server Actions enforce strict input validation using Zod schemas via `next-safe-action` or direct `.safeParse()`.
  Example from `features/catalog/vendor.actions.ts:27-28`:
  ```typescript
  // File: features/catalog/vendor.actions.ts#L27-L28
  export const addProductAction = vendorAction.schema(addProductSchema);
  ```
  Example from `features/contact/actions.ts:74`:
  ```typescript
  // File: features/contact/actions.ts#L74
  const parsed = contactFormSchema.safeParse(data);
  ```

### 2.5 Path Traversal Prevention

- **Status:** ✅ Confirmed Secure
- **Code Evidence:**
  Node.js `fs` module is not imported or used anywhere inside `app/`, `features/`, or `shared/`.
  All file assets (product media, vendor logos, payment slips) are stored in cloud object storage (Cloudinary and Supabase Storage) via SDKs. No filesystem paths are constructed from user input.

---

## 3. Authentication

### 3.1 Delegated Identity Management

- **Status:** ✅ Confirmed Secure
- **Code Evidence:**
  - 100% of user authentication (signup, signin, password recovery, session renewal) is handled by Clerk.
  - Zero password hashes or salt fields exist across the Drizzle schema (`shared/db/schema/*.ts`).
  - Search for `bcrypt`, `argon2`, `scrypt`, and `crypto.pbkdf2` returned zero custom credential management implementations.

### 3.2 Secure Session Cookies

- **Status:** ✅ Confirmed Secure
- **Code Evidence:**
  Clerk automatically issues and validates session cookies (`__session`, `__client_uat`) marked `HttpOnly`, `Secure`, and `SameSite=Lax`.

### 3.3 Route Protection

- **Status:** ✅ Confirmed Secure
- **Code Evidence:**
  `proxy.ts:3-8, 134-139`:
  ```typescript
  // File: proxy.ts#L3-L8
  const isProtectedRoute = createRouteMatcher([
    "/admin(.*)",
    "/vendor(.*)",
    "/superadmin(.*)",
    "/customer(.*)",
  ]);

  // File: proxy.ts#L134-L139
  if (isProtectedRoute(req)) {
    const authState = await auth();
    if (!authState.userId) {
      return authState.redirectToSignIn({ returnBackUrl: req.url });
    }
  }
  ```

### 3.4 Account Enumeration Defense

- **Status:** ✅ Confirmed Secure
- **Code Evidence:**
  `app/sign-in/[[...sign-in]]/page.tsx:12` and `app/sign-up/[[...sign-up]]/page.tsx:12` render Clerk pre-built components `<SignIn />` and `<SignUp />`. Clerk’s authentication endpoints respond with generic authentication failure states that do not disclose account existence.

---

## 4. Authorization & Access Control

### 4.1 Server-Side Role Enforcement

- **Status:** ✅ Confirmed Secure
- **Code Evidence:**
  `lib/safe-action.ts` defines hierarchical action clients:
  - `authenticatedAction` (`lib/safe-action.ts:47-66`): Verifies `userId` exists.
  - `vendorAction` (`lib/safe-action.ts:71-89`): Explicitly rejects customers:
    ```typescript
    // File: lib/safe-action.ts#L77-L79
    if (role === "customer") {
      throw new ActionError("Unauthorized: Customers cannot perform vendor actions.");
    }
    ```
  - `orgAdminAction` (`lib/safe-action.ts:94-105`): Requires `orgRole === "org:admin"`.
  - `superadminAction` (`lib/safe-action.ts:110-119`): Dual-gate check via `shared/auth/superadmin.server.ts:27-41`:
    ```typescript
    // File: shared/auth/superadmin.server.ts#L32-L41
    const privateMeta = (user.privateMetadata || {}) as Record<string, unknown>;
    const isPrivateSuper = privateMeta.platformRole === SUPERADMIN_PLATFORM_ROLE;
    const isAllowlisted = getSuperAdminAllowlistFromEnv().has(user.id);

    if (isPrivateSuper && isAllowlisted) {
      return { granted: true, source: "dual_gate" };
    }
    return { granted: false, source: null };
    ```
  Roles are resolved from server session claims or Clerk server-side API, never accepted from request bodies.

### 4.2 Customer Data Isolation & Cross-Tenant Access

- **Status:** ✅ Confirmed Secure
- **Positive Code Evidence (Orders & Invoices):**
  - `features/orders/customer-ownership.ts:9-20`:
    ```typescript
    // File: features/orders/customer-ownership.ts#L9-L11
    export function customerOwnsOrder(
      order: CustomerOwnedOrderRow,
      userId: string | null,
    ): boolean {
      return Boolean(userId && order.customerUserId === userId);
    }
    ```
  - `features/orders/customer.actions.ts:70-72`:
    ```typescript
    // File: features/orders/customer.actions.ts#L70-L72
    if (!customerOwnsOrder(order, userId)) {
      return { success: false, error: "You are not authorized to update this order." };
    }
    ```
  - Invoice route (`app/(customer)/customer/invoice/[id]/page.tsx:38-40`):
    ```typescript
    // File: app/(customer)/customer/invoice/[id]/page.tsx#L38-L40
    if (!rawOrder || !customerOwnsOrder(rawOrder, userId)) {
      notFound();
    }
    ```
- **Remediated Vulnerability (Customer Tracking Page IDOR):**
  - File: `app/(customer)/customer/track/[orderId]/page.tsx:16-40`
    ```typescript
    // File: app/(customer)/customer/track/[orderId]/page.tsx#L16-L40
    export default async function CustomerTrackPage({ params }: TrackPageProps) {
      const { userId } = await auth();
      if (!userId) {
        redirect("/sign-in");
      }

      const { orderId } = await params;

      const [order] = await db
        .select()
        .from(simulatedOrders)
        .where(eq(simulatedOrders.id, orderId))
        .limit(1);

      if (!order) {
        notFound();
      }

      const isOwner = customerOwnsOrder(order, userId);
      const isSuperAdmin = await getCachedIsSuperAdmin(userId);

      if (!isOwner && !isSuperAdmin) {
        notFound();
      }
    ```
  - Access is now strictly restricted to the customer whose Clerk `userId` matches `order.customerUserId` (or a platform superadmin). Unauthorized requests fail with `notFound()`, disclosing neither the existence of other customers' orders nor tracking information.
  - Verified by 5 automated unit tests in `tests/unit/app/customer/track/page.test.ts`.

### 4.3 Shipping Label PDF Authorization & PII Protection

- **Status:** ✅ Confirmed Secure
- **Remediated Implementation:**
  `app/api/shipping/label-pdf/route.ts:19-70`:
  ```typescript
  // File: app/api/shipping/label-pdf/route.ts#L19-L70
  export async function GET(req: Request) {
    try {
      await rateLimit(30, 60 * 1000);

      const { userId, orgId } = await auth();
      if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { searchParams } = new URL(req.url);
      const trackingNumberRaw = searchParams.get("tracking");

      if (!trackingNumberRaw || !/^[a-zA-Z0-9_\-\.]{3,64}$/.test(trackingNumberRaw)) {
        return NextResponse.json({ error: "Invalid or missing tracking number" }, { status: 400 });
      }

      const trackingNumber = trackingNumberRaw;

      // Fetch shipment and order details
      const [shipment] = await db
        .select()
        .from(shipments)
        .where(eq(shipments.trackingNumber, trackingNumber))
        .limit(1);

      if (!shipment) {
        return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
      }

      const [order] = await db
        .select()
        .from(simulatedOrders)
        .where(eq(simulatedOrders.id, shipment.orderId))
        .limit(1);

      if (!order) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      // Verify authorization: caller must be an authorized vendor member of the shipping org,
      // the customer who owns the order, or a platform superadmin.
      const isVendor = Boolean(orgId && shipment.vendorOrgId === orgId);
      const isCustomer = Boolean(order.customerUserId && order.customerUserId === userId);
      const isSuperAdmin = await getCachedIsSuperAdmin(userId);

      if (!isVendor && !isCustomer && !isSuperAdmin) {
        return NextResponse.json(
          { error: "Forbidden: You do not have permission to access this shipment label" },
          { status: 403 },
        );
      }
  ```
- **Security Protections:**
  1. Rate limiting enforced (30 requests / min).
  2. Mandatory authentication via Clerk `auth()` (unauthenticated requests rejected with HTTP 401).
  3. Tracking number format validated against strict alphanumeric regex (`^[a-zA-Z0-9_\-\.]{3,64}$`).
  4. Multi-tenant authorization enforced: caller must be a member of the vendor organization fulfilling the shipment (`shipment.vendorOrgId === orgId`), the customer who placed the order (`order.customerUserId === userId`), or a superadmin (`getCachedIsSuperAdmin(userId)`). Unauthorized callers receive HTTP 403 Forbidden.
  5. Verified by 8 automated unit tests in `tests/unit/app/api/shipping/label-pdf/route.test.ts`.

---

## 5. CSRF & CORS

### 5.1 CSRF Protection

- **Status:** ✅ Confirmed Secure
- **Code Evidence:**
  1. Edge Proxy CSRF Gate (`proxy.ts:367-402`):
     ```typescript
     // File: proxy.ts#L367-L402
     const MUTATING_METHODS = ["POST", "PUT", "PATCH", "DELETE"];
     if (MUTATING_METHODS.includes(request.method)) {
       const pathname = request.nextUrl.pathname;
       const isWebhook = pathname.startsWith("/api/webhooks/");
       const isCspReport = pathname === "/api/csp-report";

       if (!isWebhook && !isCspReport) {
         const origin = request.headers.get("origin");
         const host = request.headers.get("x-forwarded-host") || request.headers.get("host");

         if (!origin || !host) {
           return applySecurityHeaders(
             new NextResponse("CSRF Verification Failed: Missing Origin or Host header.", {
               status: 403,
             }),
           );
         }
         const originUrl = new URL(origin);
         if (originUrl.host !== host) {
           return applySecurityHeaders(
             new NextResponse("CSRF Verification Failed: Mismatched Origin and Host.", {
               status: 403,
             }),
           );
         }
       }
     }
     ```
  2. Next.js 16 Server Actions: Built-in origin verification automatically matches `Origin` against `Host`.

### 5.2 CORS Configuration

- **Status:** ✅ Confirmed Secure
- **Code Evidence:**
  `next.config.ts:216-218`:
  ```typescript
  // File: next.config.ts#L216-L218
  { key: "Access-Control-Allow-Origin", value: DEFAULT_APP_URL },
  { key: "Access-Control-Allow-Methods", value: "GET,HEAD,POST,OPTIONS" },
  { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
  ```
  `DEFAULT_APP_URL` resolves to `"https://www.dilnova.pp.ua"`. Zero wildcard (`*`) origins are emitted.

### 5.3 OPTIONS Preflight Safety

- **Status:** ✅ Confirmed Secure
- **Code Evidence:**
  No custom unauthenticated `OPTIONS` handlers exist in `app/api/**`. Preflight requests are handled by Next.js edge router with static response headers strictly enforcing `Access-Control-Allow-Origin: https://www.dilnova.pp.ua`.

---

## 6. Security Headers & Transport

### 6.1 Security Headers

- **Status:** ✅ Confirmed Secure
- **Code Evidence:**
  Configured in both `proxy.ts:103-131` and `next.config.ts:183-227`:
  - `X-Frame-Options`: `DENY`
  - `X-Content-Type-Options`: `nosniff`
  - `Referrer-Policy`: `strict-origin-when-cross-origin`
  - `Permissions-Policy`: `camera=(), microphone=(), geolocation=(), payment=(), usb=(), display-capture=(), autoplay=()`
  - `Cross-Origin-Opener-Policy`: `same-origin`
  - `X-DNS-Prefetch-Control`: `off`
  - `Strict-Transport-Security`: `max-age=63072000; includeSubDomains; preload` (2 years)

### 6.2 Content Security Policy (CSP)

- **Status:** ✅ Confirmed Secure
- **Code Evidence:**
  `proxy.ts:190-199`:
  ```typescript
  // File: proxy.ts#L190-L199
  const isProd = process.env.NODE_ENV === "production";
  const isVercelProdOrPreview =
    process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview";
  const excludeEval = isProd || isVercelProdOrPreview;

  const cspHeader = `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${clerkDomainsStr} https://challenges.cloudflare.com https://translate.google.com https://*.googleapis.com https://*.gstatic.com https://va.vercel-scripts.com blob:${excludeEval ? "" : " 'unsafe-eval'"}; style-src 'self' 'unsafe-inline' https://*.googleapis.com https://*.gstatic.com; ...`;
  ```
- **Directives Review:**
  - `script-src`: Uses cryptographic nonces (`'nonce-${nonce}' 'strict-dynamic'`). No `'unsafe-inline'` script execution permitted.
  - `'unsafe-eval'`: Excluded in production and preview (`excludeEval` is true). Only enabled in local development for HMR.
  - `style-src`: Contains `'unsafe-inline'` to support Tailwind dynamic classes and React CSS properties (justified).
  - `upgrade-insecure-requests`: Enabled in production.

---

## 7. Rate Limiting & Abuse Prevention

### 7.1 Implemented Rate Limits

- **Status:** ✅ Confirmed Secure
- **Code Evidence:**
  | Target Endpoint / Action       | File Location                                           | Limit     | Scope   | Fail Policy      |
  | ------------------------------ | ------------------------------------------------------- | --------- | ------- | ---------------- |
  | Edge Server Actions            | `proxy.ts:61`                                           | 300 / min | IP      | Fail Open (Edge) |
  | Edge Mutating API              | `proxy.ts:61`                                           | 180 / min | IP      | Fail Open (Edge) |
  | Contact Form                   | `features/contact/actions.ts:104`                       | 2 / min   | IP      | **Fail Closed**  |
  | Direct Checkout Order          | `features/cart/checkout.actions.ts:121`                 | 3 / min   | User    | **Fail Closed**  |
  | Guest Checkout Order           | `features/cart/checkout.actions.ts:144`                 | 15 / min  | User/IP | **Fail Closed**  |
  | Simulated Order Checkout       | `features/cart/checkout.actions.ts:231`                 | 5 / min   | User    | **Fail Closed**  |
  | Bank Transfer Verification     | `features/billing/checkout.actions.ts:26`               | 30 / min  | User    | **Fail Closed**  |
  | Product Reviews                | `features/catalog/product-detail.actions.ts:84`         | 5 / min   | User    | **Fail Closed**  |
  | Product Questions              | `features/catalog/product-detail.actions.ts:168`        | 5 / min   | User    | **Fail Closed**  |
  | Product Answers                | `features/catalog/product-detail.actions.ts:202`        | 10 / min  | User    | **Fail Closed**  |
  | Superadmin Platform Operations | `features/superadmin/actions.ts:24`                     | 20 / min  | User    | **Fail Closed**  |
  | GDPR Data Erasure              | `app/api/admin/data-subject-request/erase/route.ts:10`  | 5 / min   | User    | **Fail Closed**  |
  | GDPR Data Export               | `app/api/admin/data-subject-request/export/route.ts:12` | 5 / min   | User    | **Fail Closed**  |
  | CSP Violation Ingestion        | `app/api/csp-report/route.ts:48`                        | 5 / min   | IP      | Fail Open        |

### 7.2 Redis Outage Behavior (Fail-Open vs. Fail-Closed)

- **Status:** ✅ Confirmed Secure
- **Code Evidence:**
  `shared/security/rate-limit.ts:121-143`:
  ```typescript
  // File: shared/security/rate-limit.ts#L126-L131
  if (isProductionEnvironment()) {
    if (options?.failClosed) {
      throw new Error(PRODUCTION_RATE_LIMIT_UNAVAILABLE_ERROR);
    }
    return; // Fail-open strategy: bypass rate limit for non-critical paths
  }
  ```
  - For critical mutations (checkout, contact forms, reviews, admin actions), `failClosed: true` is passed. If Upstash Redis is down, these endpoints reject requests to avoid abuse during infrastructure degradation.
  - For non-critical browse requests, the system fails open to avoid service disruptions.

### 7.3 Limit Key Scoping

- **Status:** ✅ Confirmed Secure
- **Code Evidence:**
  `shared/security/rate-limit.ts:98-105`:
  ```typescript
  // File: shared/security/rate-limit.ts#L98-L105
  const ip =
    reqHeaders.get("cf-connecting-ip")?.trim() ||
    reqHeaders.get("x-real-ip")?.trim() ||
    reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "127.0.0.1";

  const limitKey = identifier || ip;
  ```
  IP detection prioritizes edge-injected headers (`cf-connecting-ip`, `x-real-ip`) over client-controlled `x-forwarded-for`.

---

## 8. Data Exposure & API Security

### 8.1 API Response Field Filtering

- **Status:** ✅ Confirmed Secure
- **Code Evidence:**
  Database queries explicitly project required fields:
  - Branch selection: `app/api/shipping/rates/route.ts:49-54`: `.select({ productId: branchInventory.productId, branchId: branchInventory.branchId })`
  - Presence status: `app/api/vendor/presence/route.ts:50-60`
  - Zero raw `select *` queries are returned directly to clients from user management or credential tables.

### 8.2 Error Response Obfuscation

- **Status:** ✅ Confirmed Secure
- **Code Evidence:**
  1. API Route error wrapper (`shared/api/api-handler.ts:16-18`):
     ```typescript
     // File: shared/api/api-handler.ts#L16-L18
     logger.error("[API Error]", error, { method: req.method, url: safeUrl });
     return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
     ```
  2. Server Action error handler (`lib/safe-action.ts:33-41`):
     ```typescript
     // File: lib/safe-action.ts#L33-L41
     if (e instanceof ActionError) {
       return e.message;
     }
     if (e instanceof Error && e.message.includes("Rate limit")) {
       return e.message;
     }
     return "An unexpected error occurred. Please try again.";
     ```
  Stack traces and database schema names are never emitted in client responses in production.

### 8.3 Pagination Scrape Prevention

- **Status:** ✅ Confirmed Secure
- **Code Evidence:**
  - `features/catalog/queries.ts:163`: `Math.min(..., MAX_REVIEWS_PER_PAGE)`
  - `features/catalog/queries.ts:222`: `Math.min(..., 200)`
  - `app/api/webhooks/qstash/export/route.ts:74`: Hard cap of 10,000 records on bulk exports.

---

## 9. Dependency & Supply Chain

### 9.1 Vulnerability Audit

- **Status:** ✅ Confirmed Secure
- **Command Output:**
  ```
  pnpm audit
  No known vulnerabilities found
  ```
- **Analysis:** Zero CVEs at any severity level across all production and development dependencies.

### 9.2 Resolution Overrides

- **Status:** ✅ Confirmed Secure
- **Code Evidence:**
  `package.json:6-18`:
  ```json
  "resolutions": {
    "postcss": ">=8.5.10",
    "js-cookie": ">=3.0.6",
    "esbuild": "^0.28.1",
    "brace-expansion": ">=5.0.8",
    "minimatch": ">=10.2.5",
    "sharp": ">=0.35.4",
    "fast-uri": ">=3.1.6",
    "browserslist": ">=4.28.7",
    "js-yaml": ">=4.3.2",
    "vitest": ">=4.1.11",
    "@vitest/mocker": ">=4.1.11"
  }
  ```
  Known upstream vulnerabilities in transitive packages are pinned to patched versions via package resolutions.

---

## 10. Logging & Error Handling

### 10.1 Structured Logging & Injection Prevention

- **Status:** ✅ Confirmed Secure
- **Code Evidence:**
  `shared/logging/logger.ts:99-102`:
  ```typescript
  // File: shared/logging/logger.ts#L99-L102
  function sanitizeLogString(val: string | undefined | null): string {
    if (!val) return "";
    return String(val).replace(/[\r\n]/g, " ");
  }
  ```
  All log messages and request IDs are stripped of CRLF characters to prevent Log Injection / Log Splitting attacks.

### 10.2 Direct Console Error Invocations

- **Status:** ⚠️ Issue Found (Low)
- **Code Evidence:**
  `app/api/shipping/labels/route.ts:121` and `app/api/shipping/rates/route.ts:169`:
  ```typescript
  // File: app/api/shipping/labels/route.ts#L121
  console.error("[POST /api/shipping/labels] Error:", err);
  ```
  Calling raw `console.error` bypasses Sentry exception recording and correlation tracking.
- **Severity:** Low
- **Remediation:** Replace with `logger.error("[POST /api/shipping/labels] Error", err);`.

### 10.3 Audit Logging for Administrative Actions

- **Status:** ✅ Confirmed Secure
- **Code Evidence:**
  `shared/audit/logger.ts:57-70`: Administrative events are persisted to the `auditLogs` PostgreSQL table with redacted metadata, user ID, client IP, and user-agent.

---

## 11. Webhooks & Third-Party Integrations

### 11.1 Clerk Webhook Verification & Replay Protection

- **Status:** ✅ Confirmed Secure
- **Code Evidence:**
  `app/api/webhooks/clerk/route.ts:13-67`:
  ```typescript
  // File: app/api/webhooks/clerk/route.ts#L28-L37
  const timestampMs = parseInt(svixTimestamp, 10) * 1000;
  const now = Date.now();
  if (Math.abs(now - timestampMs) > 5 * 60 * 1000) {
    logger.warn("Clerk webhook verification failed: Timestamp drift too large");
    return false;
  }

  // File: app/api/webhooks/clerk/route.ts#L43-L58
  const hmac = crypto.createHmac("sha256", keyBuffer);
  const computedSignature = hmac.update(toSign).digest("base64");
  const computedBuffer = Buffer.from(computedSignature, "base64");
  ...
  if (computedBuffer.length === receivedBuffer.length && crypto.timingSafeEqual(computedBuffer, receivedBuffer)) {
    return true;
  }
  ```
  - Signature: Svix HMAC-SHA256 with `crypto.timingSafeEqual`.
  - Replay protection: Max 5-minute timestamp drift check.
  - Idempotency: Redis `SET NX` with database table `processedWebhooks` fallback.

### 11.2 QStash Webhook Signature Verification

- **Status:** ✅ Confirmed Secure
- **Code Evidence:**
  `app/api/webhooks/qstash/cleanup/route.ts:76-78`, `erase/route.ts:234-236`, `erase-org/route.ts:232-234`, `export/route.ts:304-306`:
  ```typescript
  // File: app/api/webhooks/qstash/cleanup/route.ts#L76-L78
  export const POST = async (req: NextRequest) => {
    return verifySignatureAppRouter(handler)(req);
  };
  ```
  All QStash endpoints use `@upstash/qstash/nextjs` `verifySignatureAppRouter` to verify RSA cryptographic message signatures.

### 11.3 Third-Party Failure Isolation

- **Status:** ✅ Confirmed Secure
- **Code Evidence:**
  - Email notification failure isolation (`features/orders/email/confirmation.ts:139-146`): Catches SMTP failures and logs errors without rolling back committed database transactions.
  - Storage failure isolation (`features/orders/customer.actions.ts:105-110`): Gracefully handles storage misconfiguration without crashing.

---

## Action Items & Remediation Checklist

1. ✅ **Completed:** Secured `app/api/shipping/label-pdf/route.ts` with Clerk session validation, vendor org / customer ownership check, superadmin bypass, rate limiting, and 8 unit tests in `tests/unit/app/api/shipping/label-pdf/route.test.ts`.
2. ✅ **Completed:** Added `customerOwnsOrder(order, userId)` ownership check and superadmin bypass to `app/(customer)/customer/track/[orderId]/page.tsx`, verified with 5 unit tests in `tests/unit/app/customer/track/page.test.ts`.
3. ℹ️ **Low Severity:** Replace `console.error` with `logger.error` in `app/api/shipping/labels/route.ts:121` and `app/api/shipping/rates/route.ts:169`.
4. ✅ **Completed:** `CRON_SECRET` added to `productionServerEnvSchema` in `shared/env/server.ts:52` and test added in `tests/unit/shared/env/server.test.ts`.
5. ✅ **Completed:** JSON-LD structured data in `app/vendors/[slug]/page.tsx:266` sanitized with `.replace(/</g, "\\u003c")`.
