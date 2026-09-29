import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/shared/config/env";

let adminClient: SupabaseClient | null = null;

export function isSupabaseStorageConfigured(): boolean {
  return Boolean(env.storage.supabaseUrl?.trim() && env.storage.supabaseServiceRoleKey?.trim());
}

export function createSupabaseAdminClient(): SupabaseClient {
  if (adminClient) {
    return adminClient;
  }

  const url = env.storage.supabaseUrl?.trim();
  const serviceRoleKey = env.storage.supabaseServiceRoleKey?.trim();

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase Storage is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  adminClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClient;
}
