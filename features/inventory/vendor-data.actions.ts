"use server";

import { runWithCorrelationId } from "@/shared/security/async-context";
import { rateLimit } from "@/shared/security/rate-limit";
import {
  loadVendorInventoryData,
  type GetVendorInventoryDataOptions,
} from "@/features/inventory/vendor-data";
import type { VendorInventoryFullData } from "@/features/inventory/types";

/**
 * Returns the full vendor inventory dataset for the calling vendor org.
 *
 * Auth is delegated to `verifyVendorAccess()` inside `loadVendorInventoryData`.
 * That helper calls auth() internally, validates the vendor role, and throws if
 * the caller is unauthenticated or lacks vendor permissions.
 *
 * We keep this as a plain async function (not a safe-action wrapper) because the
 * options parameter is a complex non-serialisable type that does not map cleanly
 * to a Zod schema. The internal verifyVendorAccess() call provides equivalent
 * auth enforcement.
 */
export async function getVendorInventoryData(
  options?: GetVendorInventoryDataOptions,
): Promise<VendorInventoryFullData> {
  return runWithCorrelationId(async () => {
    await rateLimit(30, 60 * 1000);
    // Auth enforced internally by verifyVendorAccess() inside loadVendorInventoryData.
    return loadVendorInventoryData("full", options) as Promise<VendorInventoryFullData>;
  });
}
