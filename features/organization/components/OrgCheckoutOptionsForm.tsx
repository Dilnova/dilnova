'use client';

import { useState, useTransition } from 'react';
import { updateOrgCheckoutOptionsAction } from '@/features/organization/checkout-options.actions';
import type { CheckoutOptionDefinition } from '@/features/organization/checkout-options.shared';

interface OrgCheckoutOptionsFormProps {
  orgId: string;
  catalog: CheckoutOptionDefinition[];
  initialOptions: Record<string, boolean>;
  branchCount?: number;
  bankTransferConfigured?: boolean;
}

export default function OrgCheckoutOptionsForm({
  orgId,
  catalog,
  initialOptions,
  branchCount = 0,
  bankTransferConfigured = false,
}: OrgCheckoutOptionsFormProps) {
  const platformOptions = catalog.filter((o) => o.platformEnabled);
  const [options, setOptions] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const option of platformOptions) {
      initial[option.id] = initialOptions[option.id] ?? (
        option.id === 'store_pickup' || option.id === 'bank_transfer'
      );
    }
    return initial;
  });
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fulfillmentOptions = platformOptions.filter((o) => o.type === 'fulfillment');
  const paymentOptions = platformOptions.filter((o) => o.type === 'payment');

  const toggleOption = (id: string) => {
    setOptions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const hasFulfillment = fulfillmentOptions.some((option) => options[option.id] === true);
    const hasPayment = paymentOptions.some((option) => options[option.id] === true);
    if (!hasFulfillment || !hasPayment) {
      setMessage({
        type: 'error',
        text: 'Enable at least one fulfillment method and one payment method before saving.',
      });
      return;
    }

    if (options.bank_transfer === true && !bankTransferConfigured) {
      setMessage({
        type: 'error',
        text: 'Save bank name, account name, and account number in Public Page Setup before enabling bank transfer.',
      });
      return;
    }

    startTransition(async () => {
      try {
        await updateOrgCheckoutOptionsAction(orgId, options);
        setMessage({ type: 'success', text: 'Checkout options updated successfully!' });
      } catch (err) {
        setMessage({
          type: 'error',
          text: err instanceof Error ? err.message : 'Failed to update checkout options.',
        });
      }
    });
  };

  if (platformOptions.length === 0) {
    return (
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        No checkout options are currently available on the platform. Contact your platform administrator.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {message && (
        <div
          className={`p-4 rounded-lg text-sm font-mono border ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50'
              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-955/20 dark:text-rose-400 dark:border-rose-900/50'
          }`}
        >
          {message.text}
        </div>
      )}

      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
        Choose which fulfillment and payment methods customers can use when buying from your store.
        Only options enabled by the platform superadmin are listed here.
      </p>

      {fulfillmentOptions.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-mono">
            Fulfillment Methods
          </h4>
          {fulfillmentOptions.map((option) => (
            <div key={option.id} className="space-y-1">
              <OptionToggle
                option={option}
                enabled={options[option.id] === true}
                onToggle={() => toggleOption(option.id)}
              />
              {option.requiresBranch && options[option.id] === true && branchCount === 0 && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 px-1">
                  Store pickup is enabled but this organization has no branches. Add branches under inventory settings or customers will not see this option.
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {paymentOptions.length > 0 && (
        <div className="space-y-3 border-t border-zinc-200 dark:border-zinc-800 pt-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-mono">
            Payment Methods
          </h4>
          {paymentOptions.map((option) => (
            <div key={option.id} className="space-y-1">
              <OptionToggle
                option={option}
                enabled={options[option.id] === true}
                onToggle={() => toggleOption(option.id)}
              />
              {option.id === 'bank_transfer' && options[option.id] === true && !bankTransferConfigured && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 px-1">
                  Bank transfer requires bank name, account name, and account number in Public Page Setup above.
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full sm:w-auto px-6 py-2.5 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white text-xs font-bold font-mono uppercase tracking-wider rounded-xl transition-all cursor-pointer"
      >
        {isPending ? 'Saving...' : 'Save Checkout Options'}
      </button>
    </form>
  );
}

function OptionToggle({
  option,
  enabled,
  onToggle,
}: {
  option: CheckoutOptionDefinition;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border border-zinc-200/60 dark:border-zinc-800 rounded-xl px-4 bg-white/50 dark:bg-zinc-900/20">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{option.label}</p>
        {option.description && (
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">{option.description}</p>
        )}
        {option.isBuiltIn && (
          <span className="inline-block mt-1 text-[9px] font-mono uppercase tracking-wider text-zinc-400">
            Built-in
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500/40 ${
          enabled ? 'bg-purple-600' : 'bg-zinc-200 dark:bg-zinc-800'
        }`}
        aria-pressed={enabled}
        aria-label={`Toggle ${option.label}`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            enabled ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
