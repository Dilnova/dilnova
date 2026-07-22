# Supabase Storage (hybrid media)

Dilnova uses a **hybrid** media setup:

| Asset                           | Provider             | Access                       |
| ------------------------------- | -------------------- | ---------------------------- |
| Product images & videos         | **Cloudinary**       | Public CDN URLs              |
| Vendor banners, logos, favicons | **Cloudinary**       | Public CDN URLs              |
| Bank payment slips              | **Supabase Storage** | Private bucket + signed URLs |

## One-time Supabase setup

1. Open **Supabase Dashboard → Storage**.
2. Create a bucket named **`payment-slips`**.
3. Set the bucket to **Private** (not public).
4. No public RLS policy is required — the app uploads and signs URLs with the **service role** on the server only.

## Environment variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key   # server only — never expose to the client
```

`SUPABASE_SERVICE_ROLE_KEY` is required for payment slip upload and signed preview URLs.

## How payment slips flow

1. Customer selects an image in the browser.
2. `uploadAndSubmitPaymentSlipAction` receives `FormData` on the server.
3. Server validates auth + order ownership, then uploads to  
   `payment-slips/orders/{orderId}/{uuid}.jpg`.
4. PostgreSQL stores the **storage path** in `simulated_orders.payment_slip_url`.
5. Customer, vendor, and superadmin UIs request a **signed URL** (5-minute TTL) for display.

Legacy rows that still contain a Cloudinary `https://` URL continue to work until migrated.

## Code locations

- `shared/storage/` — Supabase admin client, upload, signed URLs
- `features/orders/customer.actions.ts` — `uploadAndSubmitPaymentSlipAction`
- `features/orders/payment-slip-preview.ts` — attach preview URLs to orders
