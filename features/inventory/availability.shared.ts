export const STOCK_AVAILABILITY_CATALOG_KEY = "stock_availability_catalog";

export type StockAvailabilityTone = "emerald" | "rose" | "amber" | "blue" | "zinc";

export interface StockAvailabilityDefinition {
  id: string;
  label: string;
  description?: string;
  platformEnabled: boolean;
  isBuiltIn?: boolean;
  allowsPurchase: boolean;
  badgeTone?: StockAvailabilityTone;
}

export const BUILTIN_STOCK_AVAILABILITY: StockAvailabilityDefinition[] = [
  {
    id: "in_stock",
    label: "In Stock",
    description: "Available for immediate purchase",
    platformEnabled: true,
    isBuiltIn: true,
    allowsPurchase: true,
    badgeTone: "emerald",
  },
  {
    id: "out_of_stock",
    label: "Out of Stock",
    description: "Currently unavailable for purchase",
    platformEnabled: true,
    isBuiltIn: true,
    allowsPurchase: false,
    badgeTone: "rose",
  },
  {
    id: "pre_order",
    label: "Pre-Order",
    description: "Available to order before stock arrives",
    platformEnabled: true,
    isBuiltIn: true,
    allowsPurchase: true,
    badgeTone: "amber",
  },
];

export const DEFAULT_STOCK_AVAILABILITY_ID = "in_stock";

function slugifyAvailabilityId(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50);
}

export function parseStockAvailabilityCatalog(
  raw: string | null | undefined,
): StockAvailabilityDefinition[] {
  if (!raw) return [...BUILTIN_STOCK_AVAILABILITY];

  try {
    const parsed = JSON.parse(raw) as StockAvailabilityDefinition[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [...BUILTIN_STOCK_AVAILABILITY];
    }

    const builtinById = new Map(BUILTIN_STOCK_AVAILABILITY.map((o) => [o.id, o]));
    const merged: StockAvailabilityDefinition[] = [];

    for (const builtin of BUILTIN_STOCK_AVAILABILITY) {
      const fromDb = parsed.find((o) => o.id === builtin.id);
      merged.push(fromDb ? { ...builtin, ...fromDb, isBuiltIn: true } : { ...builtin });
    }

    for (const option of parsed) {
      if (!option?.id || builtinById.has(option.id)) continue;
      merged.push({
        id: option.id,
        label: option.label || option.id,
        description: option.description,
        platformEnabled: option.platformEnabled !== false,
        isBuiltIn: false,
        allowsPurchase: option.allowsPurchase !== false,
        badgeTone: isValidTone(option.badgeTone) ? option.badgeTone : "zinc",
      });
    }

    return merged;
  } catch {
    return [...BUILTIN_STOCK_AVAILABILITY];
  }
}

function isValidTone(tone: string | undefined): tone is StockAvailabilityTone {
  return (
    tone === "emerald" || tone === "rose" || tone === "amber" || tone === "blue" || tone === "zinc"
  );
}

export function buildStockAvailabilityCatalogPayload(
  options: StockAvailabilityDefinition[],
): StockAvailabilityDefinition[] {
  return options.map((option) => ({
    id: option.id,
    label: option.label.trim(),
    description: option.description?.trim(),
    platformEnabled: option.platformEnabled,
    isBuiltIn: option.isBuiltIn === true,
    allowsPurchase: option.allowsPurchase !== false,
    badgeTone: isValidTone(option.badgeTone) ? option.badgeTone : "zinc",
  }));
}

export function createCustomStockAvailability(
  label: string,
  existingIds: string[],
  allowsPurchase = true,
): StockAvailabilityDefinition {
  const baseId = slugifyAvailabilityId(label) || "custom_availability";
  let id = baseId;
  let counter = 1;
  while (existingIds.includes(id)) {
    id = `${baseId}_${counter}`;
    counter += 1;
  }

  return {
    id,
    label: label.trim(),
    platformEnabled: true,
    isBuiltIn: false,
    allowsPurchase,
    badgeTone: "blue",
  };
}

export function getEnabledStockAvailabilityOptions(
  catalog: StockAvailabilityDefinition[],
): StockAvailabilityDefinition[] {
  return catalog.filter((o) => o.platformEnabled);
}

export function resolveStockAvailabilityDefinition(
  catalog: StockAvailabilityDefinition[],
  availabilityId: string | null | undefined,
): StockAvailabilityDefinition | null {
  const enabled = getEnabledStockAvailabilityOptions(catalog);
  const match = enabled.find((o) => o.id === availabilityId);
  if (match) return match;
  return enabled.find((o) => o.id === DEFAULT_STOCK_AVAILABILITY_ID) || enabled[0] || null;
}

/**
 * Resolves the badge/status customers should see.
 * When a product is marked "In Stock" but quantity hits 0, the badge auto-switches to Out of Stock.
 * Manual statuses like Pre-Order or vendor-set Out of Stock are kept as-is.
 */
export function resolveEffectiveStockAvailability(
  catalog: StockAvailabilityDefinition[],
  storedAvailabilityId: string | null | undefined,
  quantity: number | null | undefined,
): StockAvailabilityDefinition | null {
  const stored = resolveStockAvailabilityDefinition(catalog, storedAvailabilityId);
  if (!stored) return null;

  if (quantity !== null && quantity !== undefined && quantity <= 0 && stored.id === "in_stock") {
    return resolveStockAvailabilityDefinition(catalog, "out_of_stock") || stored;
  }

  return stored;
}

export function resolveOnlineProductPurchaseState(
  productType: string,
  catalog: StockAvailabilityDefinition[],
  inventory:
    | {
        stockAvailability?: string | null;
        quantity?: number | null;
      }
    | null
    | undefined,
): {
  canPurchase: boolean;
  availabilityDef: StockAvailabilityDefinition | null;
} {
  if (productType !== "product") {
    return { canPurchase: true, availabilityDef: null };
  }

  if (!inventory) {
    return {
      canPurchase: false,
      availabilityDef: resolveStockAvailabilityDefinition(catalog, "out_of_stock"),
    };
  }

  const availabilityDef = resolveEffectiveStockAvailability(
    catalog,
    inventory.stockAvailability,
    inventory.quantity,
  );

  return {
    canPurchase: availabilityDef?.allowsPurchase ?? false,
    availabilityDef,
  };
}

export function getBadgeToneClasses(tone: StockAvailabilityTone): string {
  switch (tone) {
    case "emerald":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25";
    case "rose":
      return "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/25";
    case "amber":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25";
    case "blue":
      return "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/25";
    default:
      return "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 border-zinc-500/25";
  }
}
