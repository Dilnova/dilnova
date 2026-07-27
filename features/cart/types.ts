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
  type: string;
}
