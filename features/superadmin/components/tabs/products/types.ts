export interface Product {
  id: string;
  name: string;
  type: string;
  price: number;
  currency?: string | null;
  description: string | null;
  imageUrl: string | null;
  orgId: string;
  categoryId: string | null;
  views: number;
  categoryName: string | null;
  createdAt: Date;
  media?: { url: string; type: "image" | "video" }[] | null;
  weightGrams?: number | null;
  lengthCm?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  createdAt: Date;
}
