-- Remove deprecated pay_online payment method default
ALTER TABLE simulated_orders ALTER COLUMN payment_method SET DEFAULT 'bank_transfer';
