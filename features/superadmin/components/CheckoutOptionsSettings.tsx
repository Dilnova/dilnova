'use client';

import { useState, useTransition } from 'react';
import { updateCheckoutOptionsCatalogAction } from '@/features/superadmin/checkout-options.actions';
import {
  createCustomCheckoutOption,
  type CheckoutOptionDefinition,
  type CheckoutOptionType,
} from '@/features/organization/checkout-options.shared';
import { toast } from 'sonner';

interface CheckoutOptionsSettingsProps {
  initialCatalog: CheckoutOptionDefinition[];
}

export default function CheckoutOptionsSettings({
  initialCatalog,
}: CheckoutOptionsSettingsProps) {
  const [catalog, setCatalog] = useState<CheckoutOptionDefinition[]>(initialCatalog);
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<CheckoutOptionType>('fulfillment');
  const [isPending, startTransition] = useTransition();

  const togglePlatformEnabled = (id: string) => {
    setCatalog((prev) =>
      prev.map((option) =>
        option.id === id ? { ...option, platformEnabled: !option.platformEnabled } : option
      )
    );
  };

  const toggleOptionFlag = (
    id: string,
    flag: 'zeroShipping' | 'requiresBranch' | 'pendingPayment' | 'requiresDelivery' | 'requiresPickup'
  ) => {
    setCatalog((prev) =>
      prev.map((option) =>
        option.id === id ? { ...option, [flag]: !option[flag] } : option
      )
    );
  };

  const handleAddCustom = () => {
    const label = newLabel.trim();
    if (!label) {
      toast.error('Enter a label for the new checkout option.');
      return;
    }

    const existingIds = catalog.map((o) => o.id);
    const custom = createCustomCheckoutOption(label, newType, existingIds);
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
        await updateCheckoutOptionsCatalogAction(catalog);
        toast.success('Checkout options catalog saved.');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to save checkout options.');
      }
    });
  };

  const fulfillmentOptions = catalog.filter((o) => o.type === 'fulfillment');
  const paymentOptions = catalog.filter((o) => o.type === 'payment');

  return (
    <div className="bg-white border border-zinc-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 dark:bg-zinc-950 dark:border-zinc-800 shadow-sm space-y-4">
      <div>
        <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
          <span>🛒</span> Checkout Options Catalog
        </h3>
        <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">
          Define fulfillment and payment methods available platform-wide. Organization admins can enable or disable each option for their store.
        </p>
      </div>

      <OptionGroup
        title="Fulfillment Methods"
        options={fulfillmentOptions}
        onToggle={togglePlatformEnabled}
        onToggleFlag={toggleOptionFlag}
        onRemoveCustom={handleRemoveCustom}
      />

      <OptionGroup
        title="Payment Methods"
        options={paymentOptions}
        onToggle={togglePlatformEnabled}
        onToggleFlag={toggleOptionFlag}
        onRemoveCustom={handleRemoveCustom}
      />

      <div className="border-t border-zinc-100 dark:border-zinc-900 pt-4 space-y-3">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 font-mono">
          Add Custom Option
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="e.g. Curbside Pickup"
            className="sm:col-span-2 w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
          />
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as CheckoutOptionType)}
            className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
          >
            <option value="fulfillment">Fulfillment</option>
            <option value="payment">Payment</option>
          </select>
        </div>
        <button
          type="button"
          onClick={handleAddCustom}
          className="text-xs font-semibold px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
        >
          + Add Option
        </button>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={isPending}
        className="w-full py-2.5 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white text-xs font-bold font-mono uppercase tracking-wider rounded-xl transition-all cursor-pointer"
      >
        {isPending ? 'Saving Catalog...' : 'Save Checkout Catalog'}
      </button>
    </div>
  );
}

function OptionGroup({
  title,
  options,
  onToggle,
  onToggleFlag,
  onRemoveCustom,
}: {
  title: string;
  options: CheckoutOptionDefinition[];
  onToggle: (id: string) => void;
  onToggleFlag: (id: string, flag: 'zeroShipping' | 'requiresBranch' | 'pendingPayment' | 'requiresDelivery' | 'requiresPickup') => void;
  onRemoveCustom: (id: string) => void;
}) {
  if (options.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 font-mono">{title}</h4>
      {options.map((option) => (
        <div
          key={option.id}
          className="flex items-center justify-between gap-3 py-2 px-3 border border-zinc-100 dark:border-zinc-900 rounded-xl"
        >
          <div className="min-w-0">
            <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{option.label}</p>
            <p className="text-[10px] text-zinc-400 font-mono truncate">
              {option.id}
              {option.isBuiltIn ? ' · built-in' : ' · custom'}
              {option.type === 'fulfillment' && option.zeroShipping ? ' · free shipping' : ''}
              {option.type === 'fulfillment' && option.requiresBranch ? ' · requires branch' : ''}
              {option.type === 'payment' && option.pendingPayment ? ' · pending payment' : ''}
              {option.type === 'payment' && option.requiresDelivery ? ' · delivery only' : ''}
              {option.type === 'payment' && option.requiresPickup ? ' · pickup only' : ''}
            </p>
            {!option.isBuiltIn && option.type === 'fulfillment' && (
              <div className="flex flex-wrap gap-2 mt-1.5">
                <FlagToggle
                  label="Free shipping"
                  enabled={option.zeroShipping === true}
                  onToggle={() => onToggleFlag(option.id, 'zeroShipping')}
                />
                <FlagToggle
                  label="Requires branch"
                  enabled={option.requiresBranch === true}
                  onToggle={() => onToggleFlag(option.id, 'requiresBranch')}
                />
              </div>
            )}
            {!option.isBuiltIn && option.type === 'payment' && (
              <div className="flex flex-wrap gap-2 mt-1.5">
                <FlagToggle
                  label="Pending payment (COD)"
                  enabled={option.pendingPayment === true}
                  onToggle={() => onToggleFlag(option.id, 'pendingPayment')}
                />
                <FlagToggle
                  label="Delivery only"
                  enabled={option.requiresDelivery === true}
                  onToggle={() => onToggleFlag(option.id, 'requiresDelivery')}
                />
                <FlagToggle
                  label="Pickup only"
                  enabled={option.requiresPickup === true}
                  onToggle={() => onToggleFlag(option.id, 'requiresPickup')}
                />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!option.isBuiltIn && (
              <button
                type="button"
                onClick={() => onRemoveCustom(option.id)}
                className="text-[10px] text-red-600 hover:text-red-800 dark:text-red-400 cursor-pointer"
              >
                Remove
              </button>
            )}
            <button
              type="button"
              onClick={() => onToggle(option.id)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500/40 ${
                option.platformEnabled ? 'bg-purple-600' : 'bg-zinc-200 dark:bg-zinc-800'
              }`}
              aria-pressed={option.platformEnabled}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  option.platformEnabled ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function FlagToggle({
  label,
  enabled,
  onToggle,
}: {
  label: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
        enabled
          ? 'border-purple-500/40 bg-purple-500/10 text-purple-700 dark:text-purple-300'
          : 'border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
      }`}
    >
      {label}: {enabled ? 'on' : 'off'}
    </button>
  );
}
