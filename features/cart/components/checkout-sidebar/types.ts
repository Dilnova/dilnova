export interface SidebarFulfillmentOption {
  id: string;
  label: string;
  description?: string;
  zeroShipping: boolean;
  requiresBranch: boolean;
}

export interface SidebarPaymentOption {
  id: string;
  label: string;
  description?: string;
  requiresDelivery: boolean;
  requiresPickup?: boolean;
  pendingPayment?: boolean;
}

export interface CartTaxLineByClass {
  code: string;
  name: string;
  ratePercent: number;
  taxAmountCents: number;
  subtotalCents: number;
}

export interface ShippingRateBranchBreakdown {
  branchId: string | null;
  branchName: string;
  originCity: string;
  amountCents: number;
  estimatedDays: number;
}

export interface ShippingRateItem {
  rateId: string;
  carrierId: string;
  carrierName: string;
  serviceCode: string;
  serviceName: string;
  estimatedDays: number;
  amountCents: number;
  branchBreakdown?: ShippingRateBranchBreakdown[];
}
