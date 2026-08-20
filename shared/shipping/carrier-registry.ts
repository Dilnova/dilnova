import type { CarrierAdapter } from "./carrier.types";
import { FlatRateAdapter } from "./adapters/flat-rate.adapter";
import { BuiltInAdapter } from "./adapters/builtin/builtin.adapter";
import { SLPostAdapter } from "./providers/slpost/slpost.adapter";
import { EasyPostAdapter } from "./providers/easypost/easypost.adapter";
import { ShippoAdapter } from "./providers/shippo/shippo.adapter";

const slpostAdapter = new SLPostAdapter();

const registry = new Map<string, CarrierAdapter>([
  ["slpost", slpostAdapter],
  ["builtin", new BuiltInAdapter()],
  ["easypost", new EasyPostAdapter()],
  ["shippo", new ShippoAdapter()],
  ["flat_rate", new FlatRateAdapter()],
]);

export const ACTIVE_CARRIER_ID = process.env.SHIPPING_DEFAULT_CARRIER ?? "slpost";

export function getCarrier(id = ACTIVE_CARRIER_ID): CarrierAdapter {
  const carrier = registry.get(id);
  if (carrier) return carrier;

  console.warn(
    `[carrier-registry] Requested carrier "${id}" not found in registry. Falling back to Sri Lanka Post ("slpost").`,
  );
  const defaultCarrier = registry.get("slpost") ?? registry.get("builtin");
  if (defaultCarrier) return defaultCarrier;

  const lastResort = registry.get("flat_rate");
  if (lastResort) {
    console.error(
      "[carrier-registry] CRITICAL: Neither 'slpost' nor 'builtin' carrier adapters were found. Falling back to legacy FlatRateAdapter.",
    );
    return lastResort;
  }

  throw new Error(`[carrier-registry] No shipping carrier adapter available for id "${id}".`);
}

export function getAvailableCarriers(): CarrierAdapter[] {
  return Array.from(registry.values());
}
