-- Persist checkout breakdown on simulated orders (subtotal, tax, shipping, grand total)
ALTER TABLE simulated_orders ADD COLUMN IF NOT EXISTS subtotal_amount integer;
ALTER TABLE simulated_orders ADD COLUMN IF NOT EXISTS tax_amount integer;
ALTER TABLE simulated_orders ADD COLUMN IF NOT EXISTS shipping_amount integer;

-- Backfill legacy rows: total_amount was previously subtotal-only
UPDATE simulated_orders
SET
  subtotal_amount = total_amount,
  tax_amount = 0,
  shipping_amount = 0
WHERE subtotal_amount IS NULL;

ALTER TABLE simulated_orders ALTER COLUMN subtotal_amount SET DEFAULT 0;
ALTER TABLE simulated_orders ALTER COLUMN tax_amount SET DEFAULT 0;
ALTER TABLE simulated_orders ALTER COLUMN shipping_amount SET DEFAULT 0;
