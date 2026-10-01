export interface FeedHealthState {
  checked: boolean;
  loading: boolean;
  success?: boolean;
  productCount?: number;
  latencyMs?: number;
  lastBuildDate?: string | null;
  sampleTitles?: string[];
  error?: string;
}

export interface HeadVerificationResult {
  verified: boolean;
  checkedAt?: string;
  allActive?: boolean;
}
