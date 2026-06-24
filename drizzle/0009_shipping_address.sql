-- Delivery shipping address on online checkout orders
ALTER TABLE simulated_orders ADD COLUMN IF NOT EXISTS shipping_address text;
ALTER TABLE simulated_orders ADD COLUMN IF NOT EXISTS shipping_phone text;
