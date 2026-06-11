-- Track whether online order stock has been depleted (COD holds stock until fulfillment)
ALTER TABLE simulated_orders ADD COLUMN IF NOT EXISTS stock_depleted boolean DEFAULT false NOT NULL;

-- Existing orders depleted stock at checkout under the previous model
UPDATE simulated_orders SET stock_depleted = true;
