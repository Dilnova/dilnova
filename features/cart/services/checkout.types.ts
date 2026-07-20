import type { db } from '@/shared/db/client';

export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface VerifiedCheckoutItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  vendorOrgId: string;
  type: string;
}

export interface BranchRow {
  id: string;
  orgId: string;
  name: string;
  address: string | null;
  phone: string | null;
}
