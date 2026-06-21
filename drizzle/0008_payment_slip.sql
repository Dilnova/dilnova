-- Bank transfer payment slip workflow
ALTER TABLE simulated_orders ADD COLUMN IF NOT EXISTS payment_slip_url text;
ALTER TABLE simulated_orders ADD COLUMN IF NOT EXISTS payment_slip_uploaded_at timestamp;
ALTER TABLE simulated_orders ADD COLUMN IF NOT EXISTS payment_verified_at timestamp;
ALTER TABLE simulated_orders ADD COLUMN IF NOT EXISTS payment_verified_by text;
