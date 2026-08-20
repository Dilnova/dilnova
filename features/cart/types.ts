"use client";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  currency?: string;
  baseCurrency?: string;
  imageUrl: string | null;
  quantity: number;
  vendorName: string;
  vendorOrgId?: string;
  type: string;
  weightGrams?: number | null;
  stockQuantity?: number | null;
  stockStatus?: string | null;
}
