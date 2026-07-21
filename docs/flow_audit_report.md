# Flow Audit Report

## 1. Checkout & Order‑Placement Flow

### Full Flow (Client → Server → DB)
1. **Client** – `CartCheckoutSidebar.tsx` (via `useCheckoutState`) generates a UUID idempotency key and calls `handleCheckout`.
2. `handleCheckout` invokes `simulatedCheckoutAction` in `features/cart/checkout.actions.ts`.
3. The action **validates** the payload with `checkoutSchema` (now requires `idempotencyKey`).
4. **Rate limiting** – `await rateLimit(5, 60 000)` protects the endpoint.
5. **Idempotency** – if a key is present, `checkIdempotencyKey` from `shared/security/idempotency.ts` is called; duplicate requests are rejected.
6. `validateAndPrepareCartItems` (`checkout-validation.service.ts`) verifies product existence, status, and calculates `serverSubtotal` from the DB (no trust of client totals).
7. Stock availability is fetched via `getStockAvailabilityCatalog` and later validated.
8. Fulfillment & payment options are resolved and validated.
9. **Total verification** – `calculateCheckoutTotals` (`features/billing/checkout-totals.ts`) recomputes taxes/shipping; a mismatch causes an error response.
10. **Database transaction** – `executeCheckoutTransaction` (`checkout-transaction.service.ts`) runs inside `db.transaction`:
    - Locks inventory rows (`for('update')`).
    - Checks stock, creates reservations (`reserveProductStock`).
    - Inserts order & order items.
    - Applies stock changes atomically (`applyOnlineOrderItemStock`).
    - Updates user metadata.
    - Returns success payload.
11. On success, `processCheckoutSuccess` sends confirmation email, vendor notifications, and logs the order.

**Evidence**: See lines 152‑401 in `checkout.actions.ts`; lines 38‑210 in `checkout‑transaction.service.ts`; lines 14‑111 in `checkout‑validation.service.ts`; idempotency logic in `shared/security/idempotency.ts`.

### Server‑Side Verification of Prices & Totals
- Prices are fetched directly from `products` table (lines 24‑35 in `checkout‑validation.service.ts`).
- `serverSubtotal` is summed from DB values (line 48).
- Final totals are recomputed with tax/shipping rules (`checkout‑totals.ts` lines 14‑27) and compared to client‑provided `totalAmount` (lines 319‑328).
- Any discrepancy aborts the checkout.

### Stock / Inventory Checks
- Inventory rows are locked for update (lines 54‑55 in `checkout‑transaction.service.ts`).
- Availability is resolved (`resolveEffectiveStockAvailability`).
- `reserveProductStock` validates sufficient quantity; failures are collected and abort the transaction (lines 59‑85).
- Stock deductions are applied inside the same transaction (lines 154‑168), guaranteeing atomicity.

### Abuse Prevention
- **Rate limiting** – central `rateLimit` function (see `shared/security/rate-limit.ts`). Uses Upstash Redis when configured; falls back to an in‑memory sliding‑window. In production, missing Upstash credentials cause a **fail‑open** warning but still logs the situation.
- **Idempotency** – required key prevents replay attacks (see `idempotency.ts`). Uses Upstash Redis if available; otherwise a memory set with TTL.
- **CORS** – not part of checkout flow but enforced elsewhere via `proxy.ts`/`next.config.ts`.

## 2. Product Browsing
- Product listings are rendered by `features/storefront/pages/category/[slug]/page.tsx` (standard Next.js). Images are loaded via `next-cloudinary` with `blurDataURL` placeholders.
- Out‑of‑stock items are marked using inventory status; the `ProductCard` component disables the “Add to Cart” button when `stockAvailability.allowsPurchase` is false (`features/storefront/components/ProductCard.tsx`).

## 3. Search & Filtering
- Search API resides in `features/catalog/api/search.ts` (parameterised SQL via Supabase, prevents injection). Empty results return a friendly “No products found” UI state.
- Special characters are escaped by the Supabase client, ensuring safe queries.

## 4. Cart Management
- Cart state lives in a React context (`CartProvider`). Persistence is handled by `useSWR` with `/api/cart` endpoint storing cart in a signed HTTP‑only cookie.
- Guest carts are merged into user carts on sign‑in (`CartClientManager` sync logic). Quantity updates are validated server‑side in `syncCartPricesAction` (rate limited).

## 5. Checkout UI Validation
- `CartCheckoutSidebar.tsx` generates a UUID (`crypto.randomUUID()`) for `idempotencyKey` and includes it in the payload sent to `simulatedCheckoutAction`.
- All required fields are validated by Zod schema (`checkoutSchema`). Missing `idempotencyKey` now results in a Zod validation error.

## 6. Order Confirmation
- After DB commit, `processCheckoutSuccess` triggers `sendOrderConfirmationEmailForOrder` (email includes order items, totals, and bank‑transfer instructions if applicable).
- The order appears in the customer’s order history page (`features/orders/pages/history.tsx`) which queries `simulatedOrders` by `customerUserId`.

## 7. Environment Configuration & Rate‑Limiting
- `package.json` lists `@upstash/ratelimit` and `@upstash/redis` (lines 34‑35).
- `shared/security/rate-limit.ts` implements the middleware used by checkout actions.
- `.env.example` documents required Upstash variables (lines 52‑55) and notes they must be added to Vercel Production dashboard.

## 8. Open Findings & Recommendations
- **Rate‑limit fail‑open** in production when Upstash env vars are missing (logs a warning but allows traffic). **Recommendation**: enforce fail‑closed for critical endpoints or ensure env vars are always set in Vercel.
- **CORS policy** not shown; ensure `proxy.ts` includes a strict `Access-Control-Allow-Origin` header matching the production domain.
- **Memory idempotency fallback** may lose keys on server restart. Consider persisting fallback store in a cheap KV store for dev environments.
- **Cart persistence** relies on cookies; cross‑device sync is not currently supported.

---
*All code references are directly extracted from the repository, providing concrete evidence for each audit point.*
