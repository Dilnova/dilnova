import { pgTable, text, timestamp, integer, uuid, index, boolean, real } from "drizzle-orm/pg-core";
import { products } from "./catalog";
import { encryptedText } from "./custom-types";

export const simulatedOrders = pgTable(
  "simulated_orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    customerName: encryptedText("customer_name").notNull(),
    customerEmail: encryptedText("customer_email").notNull(),
    customerEmailHash: text("customer_email_hash"),
    customerUserId: text("customer_user_id"),
    presentmentCurrency: text("presentment_currency").default("LKR").notNull(),
    vendorBaseCurrency: text("vendor_base_currency").default("LKR").notNull(),
    exchangeRate: real("exchange_rate").default(1.0).notNull(),
    subtotalAmount: integer("subtotal_amount").default(0).notNull(),
    taxAmount: integer("tax_amount").default(0).notNull(),
    shippingAmount: integer("shipping_amount").default(0).notNull(),
    totalAmount: integer("total_amount").notNull(),
    baseSubtotalAmount: integer("base_subtotal_amount").default(0).notNull(),
    baseTaxAmount: integer("base_tax_amount").default(0).notNull(),
    baseShippingAmount: integer("base_shipping_amount").default(0).notNull(),
    baseTotalAmount: integer("base_total_amount").default(0).notNull(),
    status: text("status").default("pending").notNull(),
    fulfillmentMethod: text("fulfillment_method").default("standard_delivery").notNull(),
    paymentMethod: text("payment_method").default("bank_transfer").notNull(),
    pickupBranchId: uuid("pickup_branch_id"),
    stockDepleted: boolean("stock_depleted").default(false).notNull(),
    isPreorder: boolean("is_preorder").default(false).notNull(),
    preorderDepositPaid: integer("preorder_deposit_paid").default(0).notNull(),
    preorderBalanceDue: integer("preorder_balance_due").default(0).notNull(),
    preorderStatus: text("preorder_status").default("none").notNull(),
    paymentSlipUrl: text("payment_slip_url"),
    paymentSlipUploadedAt: timestamp("payment_slip_uploaded_at"),
    paymentVerifiedAt: timestamp("payment_verified_at"),
    paymentVerifiedBy: text("payment_verified_by"),
    shippingAddress: encryptedText("shipping_address"),
    shippingAddressLine2: encryptedText("shipping_address_line2"),
    shippingCity: encryptedText("shipping_city"),
    shippingState: encryptedText("shipping_state"),
    shippingPostalCode: encryptedText("shipping_postal_code"),
    shippingCountry: encryptedText("shipping_country"),
    shippingPhone: encryptedText("shipping_phone"),
    shippingPhone2: encryptedText("shipping_phone_2"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_simulated_orders_status").on(t.status),
    index("idx_simulated_orders_created_at").on(t.createdAt),
    index("idx_simulated_orders_customer_user_id").on(t.customerUserId),
    index("idx_simulated_orders_email_hash").on(t.customerEmailHash),
  ],
);

export const customerCarts = pgTable("customer_carts", {
  userId: text("user_id").primaryKey(),
  itemsJson: text("items_json").notNull().default("[]"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const simulatedOrderItems = pgTable(
  "simulated_order_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => simulatedOrders.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    productName: text("product_name").notNull(),
    vendorOrgId: text("vendor_org_id").notNull(),
    vendorBaseCurrency: text("vendor_base_currency").default("LKR").notNull(),
    quantity: integer("quantity").notNull(),
    unitPrice: integer("unit_price").notNull(),
    unitPriceBase: integer("unit_price_base").default(0).notNull(),
    exchangeRateSnapshot: real("exchange_rate_snapshot").default(1.0).notNull(),
  },
  (t) => [
    index("idx_simulated_order_items_order_id").on(t.orderId),
    index("idx_simulated_order_items_product_id").on(t.productId),
  ],
);
