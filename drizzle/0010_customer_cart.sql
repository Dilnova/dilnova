-- Customer cart sync and order user linkage
ALTER TABLE simulated_orders ADD COLUMN IF NOT EXISTS customer_user_id text;
CREATE INDEX IF NOT EXISTS idx_simulated_orders_customer_user_id ON simulated_orders (customer_user_id);

CREATE TABLE IF NOT EXISTS customer_carts (
  user_id text PRIMARY KEY,
  items_json text NOT NULL DEFAULT '[]',
  updated_at timestamp NOT NULL DEFAULT now()
);
