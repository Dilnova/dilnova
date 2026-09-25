export type ActiveTab =
  | "facebook_feed"
  | "whatsapp"
  | "instagram_feed"
  | "pinterest"
  | "templates"
  | "meta_catalog"
  | "webhooks";

export interface SyncLogItem {
  id: string;
  action: string;
  status: string;
  productName: string | null;
  productSku: string | null;
  metaBatchHandle: string | null;
  errorMessage: string | null;
  createdAt: Date;
}

export interface DiscoveredPage {
  id: string;
  name: string;
  link?: string;
  pictureUrl?: string;
  accessToken?: string;
}

export interface DiscoveredBoard {
  id: string;
  name: string;
  description?: string;
  imageThumbnailUrl?: string;
}

export interface DiscoveredInstagramAccount {
  id: string;
  username: string;
  name?: string;
  profilePictureUrl?: string;
}

export interface BatchSyncResult {
  total: number;
  success: number;
  alreadySynced?: number;
  skipped: number;
  failed: number;
}

export interface TestResult {
  valid: boolean;
  message: string;
}
