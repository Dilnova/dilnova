import 'server-only';

import { getSystemSetting } from './settings';
import {
  STOCK_AVAILABILITY_CATALOG_KEY,
  parseStockAvailabilityCatalog,
  type StockAvailabilityDefinition,
} from './stockAvailabilityShared';

export type { StockAvailabilityDefinition, StockAvailabilityTone } from './stockAvailabilityShared';

export {
  STOCK_AVAILABILITY_CATALOG_KEY,
  BUILTIN_STOCK_AVAILABILITY,
  DEFAULT_STOCK_AVAILABILITY_ID,
  parseStockAvailabilityCatalog,
  buildStockAvailabilityCatalogPayload,
  createCustomStockAvailability,
  getEnabledStockAvailabilityOptions,
  resolveStockAvailabilityDefinition,
  resolveEffectiveStockAvailability,
  getBadgeToneClasses,
} from './stockAvailabilityShared';

export async function getStockAvailabilityCatalog(): Promise<StockAvailabilityDefinition[]> {
  const raw = await getSystemSetting(STOCK_AVAILABILITY_CATALOG_KEY, '');
  return parseStockAvailabilityCatalog(raw);
}

export async function validateStockAvailabilityId(
  availabilityId: string
): Promise<StockAvailabilityDefinition | null> {
  const catalog = await getStockAvailabilityCatalog();
  const enabled = catalog.filter((o) => o.platformEnabled);
  return enabled.find((o) => o.id === availabilityId) || null;
}
