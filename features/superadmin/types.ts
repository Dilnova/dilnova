import type { simulatedOrders, simulatedOrderItems, contactSubmissions } from "@/shared/db/schema";

export type ComplianceOrderItem = typeof simulatedOrderItems.$inferSelect;

export type ComplianceOrder = Omit<typeof simulatedOrders.$inferSelect, "customerEmailHash"> & {
  items?: ComplianceOrderItem[];
};

export type ComplianceContactSubmission = Omit<typeof contactSubmissions.$inferSelect, "emailHash">;

export interface ComplianceDsarData {
  email: string;
  orders: ComplianceOrder[];
  contactSubmissions: ComplianceContactSubmission[];
}

export interface ComplianceApiData {
  orders?: unknown[];
  contactSubmissions?: unknown[];
  cart?: unknown;
  reviews?: unknown[];
  questions?: unknown[];
  wishlists?: unknown[];
  auditLogs?: unknown[];
  [key: string]: unknown;
}
