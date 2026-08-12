import { pgTable, text, timestamp, integer, uuid, index, jsonb } from "drizzle-orm/pg-core";
import { simulatedOrders } from "./orders";
import { branches } from "./billing";

export interface ShipmentEvent {
  status: string;
  description: string;
  location?: string;
  timestamp: string;
}

export const shipments = pgTable(
  "shipments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .references(() => simulatedOrders.id, { onDelete: "cascade" })
      .notNull(),
    vendorOrgId: text("vendor_org_id").notNull(),
    originBranchId: uuid("origin_branch_id").references(() => branches.id),
    carrierName: text("carrier_name").notNull(),
    shipmentExternalId: text("shipment_external_id"),
    trackingNumber: text("tracking_number"),
    trackingUrl: text("tracking_url"),
    labelUrl: text("label_url"),
    status: text("status").default("label_created").notNull(),
    shippingService: text("shipping_service"),
    shippingZone: text("shipping_zone"),
    rateAmountCents: integer("rate_amount_cents").default(0).notNull(),
    weightGrams: integer("weight_grams"),
    estimatedDeliveryDate: timestamp("estimated_delivery_date"),
    deliveredAt: timestamp("delivered_at"),
    events: jsonb("events").$type<ShipmentEvent[]>().default([]).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_shipments_order_id").on(t.orderId),
    index("idx_shipments_tracking_number").on(t.trackingNumber),
    index("idx_shipments_vendor_org_id").on(t.vendorOrgId),
    index("idx_shipments_status").on(t.status),
  ],
);
