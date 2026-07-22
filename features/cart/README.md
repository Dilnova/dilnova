# Cart & checkout

Multi-vendor cart, guest/local storage sync, checkout options, and simulated order placement.

**Public API:** `@/features/cart`

| Module                    | Role                                |
| ------------------------- | ----------------------------------- |
| `vendor-checkout.ts`      | Vendor grouping, selection helpers  |
| `guest-storage.ts`        | localStorage guest cart             |
| `schema.ts`               | Zod validation                      |
| `checkout.actions.ts`     | Email summary, price sync, checkout |
| `sync.actions.ts`         | Signed-in cart persistence          |
| `context/CartContext.tsx` | Client cart state                   |
| `components/`             | AddToCart, CartIcon, merge banner   |
