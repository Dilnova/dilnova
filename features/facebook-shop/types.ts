export interface MetaProductItem {
  id: string; // Unique product ID / SKU
  title: string; // Max 200 characters
  description?: string; // Plain text, max 9,999 characters
  availability: "in stock" | "out of stock" | "preorder";
  condition: "new" | "refurbished" | "used";
  price: string; // e.g. "45.00 USD" or "4500.00 LKR"
  link: string; // Storefront checkout URL
  image_link: string; // Primary image URL
  brand: string; // Manufacturer or vendor brand name
  additional_image_cdn_urls?: string[]; // Extra media images if any
}

export interface MetaBatchRequest {
  method: "CREATE" | "UPDATE" | "DELETE";
  retailer_id?: string;
  data?: MetaProductItem | { id: string; [key: string]: unknown };
}

export interface MetaBatchPayload {
  item_type: "PRODUCT_ITEM";
  requests: MetaBatchRequest[];
}

export interface MetaBatchResponse {
  handles?: string[];
  error?: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

export interface MetaBatchStatusResponse {
  id?: string;
  status?: "COMPLETED" | "PARTIAL_ERROR" | "ERROR" | "PROCESSING";
  errors_total_count?: number;
  handles?: string[];
  errors?: Array<{
    id: string;
    message: string;
    code: number;
  }>;
  error?: {
    message: string;
    code: number;
  };
}

export interface MetaCatalogVerificationResult {
  valid: boolean;
  catalogName?: string;
  businessId?: string;
  error?: string;
}
