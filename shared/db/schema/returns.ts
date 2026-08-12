import { pgTable, text, timestamp, integer, uuid, index } from "drizzle-orm/pg-core";
import { simulatedOrders } from "./orders";
import { encryptedText } from "./custom-types";

export const returns = pgTable(
  "returns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .references(() => simulatedOrders.id, { onDelete: "cascade" })
      .notNull(),
    customerId: text("customer_id").notNull(),
    reason: text("reason").notNull(),
    status: text("status").default("requested").notNull(),
    returnLabelUrl: text("return_label_url"),
    returnTrackingNumber: text("return_tracking_number"),
    returnCarrier: text("return_carrier"),
    refundAmountCents: integer("refund_amount_cents"),
    vendorNotes: text("vendor_notes"),
    customerNotes: encryptedText("customer_notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_returns_order_id").on(t.orderId),
    index("idx_returns_customer_id").on(t.customerId),
    index("idx_returns_status").on(t.status),
  ],
);
