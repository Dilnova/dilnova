'use client';

import { useState, useTransition } from 'react';
import { updateStockAvailabilityCatalogAction } from '@/features/inventory/availability.actions';
import {
  createCustomStockAvailability,
  type StockAvailabilityDefinition,
} from '@/features/inventory/availability.shared';
import { toast } from 'sonner';

interface StockAvailabilitySettingsProps {
  initialCatalog: StockAvailabilityDefinition[];
}

export default function StockAvailabilitySettings({
  initialCatalog,
}: StockAvailabilitySettingsProps) {
  const [catalog, setCatalog] = useState<StockAvailabilityDefinition[]>(initialCatalog);
  const [newLabel, setNewLabel] = useState('');
  const [newAllowsPurchase, setNewAllowsPurchase] = useState(true);
  const [isPending, startTransition] = useTransition();

  const togglePlatformEnabled = (id: string) => {
    setCatalog((prev) =>
      prev.map((option) =>
        option.id === id ? { ...option, platformEnabled: !option.platformEnabled } : option
      )
    );
  };

  const toggleAllowsPurchase = (id: string) => {
    setCatalog((prev) =>
      prev.map((option) =>
        option.id === id ? { ...option, allowsPurchase: !option.allowsPurchase } : option
      )
    );
  };

  const handleAddCustom = () => {
    const label = newLabel.trim();
    if (!label) {
      toast.error('Enter a label for the new stock availability option.');
      return;
    }

    const existingIds = catalog.map((o) => o.id);
    const custom = createCustomStockAvailability(label, existingIds, newAllowsPurchase);
    setCatalog((prev) => [...prev, custom]);
    setNewLabel('');
    toast.success(`Added "${custom.label}". Save to apply platform-wide.`);
  };

  const handleRemoveCustom = (id: string) => {
    setCatalog((prev) => prev.filter((o) => o.id !== id || o.isBuiltIn));
  };

  const handleSave = () => {
    startTransition(async () => {
      try {
        await updateStockAvailabilityCatalogAction(catalog);
        toast.success('Stock availability catalog saved.');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to save stock availability catalog.');
      }
    });
  };

  return (
    <div className="bg-white border border-zinc-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 dark:bg-zinc-950 dark:border-zinc-800 shadow-sm space-y-4">
      <div>
        <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
          <span>📦</span> Stock Availability Catalog
        </h3>
        <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">
          Define stock status labels vendors can assign to products — e.g. In Stock, Out of Stock, Pre-Order.
        </p>
      </div>

      <div className="space-y-2">
        {catalog.map((option) => (
          <div
            key={option.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2 px-3 border border-zinc-100 dark:border-zinc-900 rounded-xl"
          >
            <div className="min-w-0">
              <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{option.label}</p>
              <p className="text-[10px] text-zinc-400 font-mono truncate">
                {option.id}
                {option.isBuiltIn ? ' · built-in' : ' · custom'}
                {' · '}
                {option.allowsPurchase ? 'purchasable' : 'not purchasable'}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {!option.isBuiltIn && (
                <button
                  type="button"
                  onClick={() => handleRemoveCustom(option.id)}
                  className="text-[10px] text-red-600 hover:text-red-800 dark:text-red-400 cursor-pointer"
                >
                  Remove
                </button>
              )}
              <label className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                <input
                  type="checkbox"
                  checked={option.allowsPurchase}
                  onChange={() => toggleAllowsPurchase(option.id)}
                />
                Can buy
              </label>
              <ToggleButton enabled={option.platformEnabled} onToggle={() => togglePlatformEnabled(option.id)} />
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-zinc-100 dark:border-zinc-900 pt-4 space-y-3">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 font-mono">
          Add Custom Status
        </h4>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="e.g. Backorder, Limited Stock"
            className="flex-1 w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
          />
          <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 px-2">
            <input
              type="checkbox"
              checked={newAllowsPurchase}
              onChange={(e) => setNewAllowsPurchase(e.target.checked)}
            />
            Allows purchase
          </label>
        </div>
        <button
          type="button"
          onClick={handleAddCustom}
          className="text-xs font-semibold px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
        >
          + Add Status
        </button>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={isPending}
        className="w-full py-2.5 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white text-xs font-bold font-mono uppercase tracking-wider rounded-xl transition-all cursor-pointer"
      >
        {isPending ? 'Saving Catalog...' : 'Save Stock Availability Catalog'}
      </button>
    </div>
  );
}

function ToggleButton({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500/40 ${
        enabled ? 'bg-purple-600' : 'bg-zinc-200 dark:bg-zinc-800'
      }`}
      aria-pressed={enabled}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          enabled ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  );
}
