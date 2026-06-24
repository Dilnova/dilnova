'use client';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  quantity: number;
  vendorName: string;
  type: string;
}
