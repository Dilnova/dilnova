export interface InventoryItem {
  id: string;
  productId: string;
  sku: string | null;
  quantity: number;
  lowStockThreshold: number;
  binLocation: string | null;
  supplierId: string | null;
  stockAvailability: string;
  updatedAt: Date;
  productName: string;
  productType: string;
  productOrgId: string;
  supplierName: string | null;
}

export interface Supplier {
  id: string;
  orgId: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  createdAt: Date;
}

export interface InventoryMovement {
  id: string;
  inventoryId: string;
  type: string;
  quantityChanged: number;
  previousQuantity: number;
  newQuantity: number;
  reason: string | null;
  userId: string;
  createdAt: Date;
  productName: string | null;
}

export interface SimulatedOrder {
  id: string;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  subtotalAmount?: number | null;
  taxAmount?: number | null;
  shippingAmount?: number | null;
  status: string;
  fulfillmentMethod: string;
  paymentMethod: string;
  pickupBranchId: string | null;
  pickupBranchName?: string | null;
  paymentSlipUrl?: string | null;
  paymentSlipPreviewUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: {
    id: string;
    productName: string;
    vendorOrgId: string;
    quantity: number;
    unitPrice: number;
  }[];
}

export interface ProductForInventory {
  id: string;
  name: string;
  type: string;
  orgId: string;
}
