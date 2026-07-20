'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { useConfirm } from '@/shared/ui/notifications';
import {
  createPricingPlanAction,
  updatePricingPlanAction,
  deletePricingPlanAction,
} from '@/features/superadmin/actions';
import { PendingOverlay } from '@/shared/ui/PendingOverlay';

export interface PricingPlan {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string | null;
  features: string[];
  isPopular: boolean;
  buttonText: string;
  buttonLink: string;
  createdAt: Date;
  updatedAt: Date;
}

interface PricingTabProps {
  pricingPlans: PricingPlan[];
}

export default function PricingTab({ pricingPlans }: PricingTabProps) {
  const [isPending, startTransition] = useTransition();
  const { confirmAction } = useConfirm();

  const [planName, setPlanName] = useState('');
  const [planPrice, setPlanPrice] = useState('');
  const [planPeriod, setPlanPeriod] = useState('/month');
  const [planDesc, setPlanDesc] = useState('');
  const [planFeatures, setPlanFeatures] = useState('');
  const [planIsPopular, setPlanIsPopular] = useState(false);
  const [planButtonText, setPlanButtonText] = useState('Get Started');
  const [planButtonLink, setPlanButtonLink] = useState('/contact');
  const [editingPricingPlan, setEditingPricingPlan] = useState<PricingPlan | null>(null);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);

  const triggerNotification = (success: boolean, text: string) => {
    if (success) toast.success(text);
    else toast.error(text);
  };

  const openAddPricingPlan = () => {
    setEditingPricingPlan(null);
    setPlanName('');
    setPlanPrice('');
    setPlanPeriod('/month');
    setPlanDesc('');
    setPlanFeatures('');
    setPlanIsPopular(false);
    setPlanButtonText('Get Started');
    setPlanButtonLink('/contact');
    setIsPricingModalOpen(true);
  };

  const openEditPricingPlan = (plan: PricingPlan) => {
    setEditingPricingPlan(plan);
    setPlanName(plan.name);
    setPlanPrice(plan.price);
    setPlanPeriod(plan.period);
    setPlanDesc(plan.description || '');
    setPlanFeatures((plan.features || []).join('\n'));
    setPlanIsPopular(plan.isPopular);
    setPlanButtonText(plan.buttonText);
    setPlanButtonLink(plan.buttonLink);
    setIsPricingModalOpen(true);
  };

  const handleSavePricingPlan = async (e: React.FormEvent) => {
    e.preventDefault();

    const featuresArray = planFeatures
      .split('\n')
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

    startTransition(async () => {
      try {
        const payload = {
          name: planName,
          price: planPrice,
          period: planPeriod,
          description: planDesc || undefined,
          features: featuresArray,
          isPopular: planIsPopular,
          buttonText: planButtonText,
          buttonLink: planButtonLink,
        };

        if (editingPricingPlan) {
          await updatePricingPlanAction(editingPricingPlan.id, payload);
          triggerNotification(true, 'Pricing plan updated successfully.');
        } else {
          await createPricingPlanAction(payload);
          triggerNotification(true, 'Pricing plan created successfully.');
        }
        setIsPricingModalOpen(false);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to save pricing plan.';
        triggerNotification(false, msg);
      }
    });
  };

  const handleDeletePricingPlan = async (planId: string) => {
    const confirmed = await confirmAction({
      title: 'Delete Pricing Plan',
      message: 'Are you sure you want to permanently delete this pricing plan?',
      confirmText: 'Delete',
      variant: 'danger'
    });
    if (!confirmed) return;

    toast.promise(
      deletePricingPlanAction(planId),
      {
        loading: 'Deleting pricing plan...',
        success: 'Pricing plan deleted successfully.',
        error: (err) => err instanceof Error ? err.message : 'Failed to delete pricing plan.'
      }
    );
  };

  return (
    <div className="space-y-4">
      <PendingOverlay isPending={isPending} />

      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-zinc-50">Pricing Plans</h2>
          <p className="text-[10px] sm:text-[11px] text-zinc-400 font-mono mt-0.5">Manage pricing options shown on the landing page</p>
        </div>
        <button
          onClick={openAddPricingPlan}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-900/10 cursor-pointer active:scale-[0.97] whitespace-nowrap"
        >
          Add Plan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pricingPlans.map((plan) => (
          <div key={plan.id} className={`bg-white border rounded-2xl p-5 dark:bg-zinc-950 shadow-sm flex flex-col justify-between ${plan.isPopular ? 'border-purple-500' : 'border-zinc-200 dark:border-zinc-800'}`}>
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">{plan.name}</h3>
                {plan.isPopular && (
                  <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-mono text-[9px] uppercase tracking-wider font-extrabold">Popular</span>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">{plan.description || 'No description provided.'}</p>
              <div className="text-2xl font-black text-zinc-900 dark:text-zinc-50 font-mono mb-4">
                {plan.price}
                <span className="text-xs font-normal text-zinc-400">{plan.period}</span>
              </div>
              <div className="space-y-1.5 mb-6">
                <p className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider">Features</p>
                <ul className="text-xs space-y-1 text-zinc-650 dark:text-zinc-350">
                  {(plan.features || []).map((feat, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span className="text-emerald-500 font-bold">✓</span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="flex gap-2 border-t border-zinc-100 dark:border-zinc-900 pt-4">
              <button
                onClick={() => openEditPricingPlan(plan)}
                className="flex-1 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold rounded-lg transition-colors cursor-pointer text-center"
              >
                Edit
              </button>
              <button
                onClick={() => handleDeletePricingPlan(plan.id)}
                className="flex-1 py-2 bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/20 dark:hover:bg-red-900/30 dark:text-red-400 text-xs font-bold rounded-lg transition-colors cursor-pointer text-center"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {pricingPlans.length === 0 && (
          <div className="col-span-full py-12 text-center text-zinc-400 text-xs font-mono border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
            No custom pricing plans configured. Using default homepage fallbacks.
          </div>
        )}
      </div>

      {isPricingModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-40" onClick={() => setIsPricingModalOpen(false)}>
          <div
            className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 w-full sm:max-w-md shadow-2xl max-h-[90vh] overflow-y-auto safe-area-bottom"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'mobileMenuSlideDown 0.2s ease-out' }}
          >
            <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-50 mb-1">
              {editingPricingPlan ? 'Edit Pricing Plan' : 'Create Pricing Plan'}
            </h3>
            <p className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider mb-5">Database configuration</p>

            <form onSubmit={handleSavePricingPlan} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">Plan Name</label>
                <input
                  type="text"
                  required
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="e.g. Starter"
                  className="w-full px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">Price (e.g. $49 or Custom)</label>
                  <input
                    type="text"
                    required
                    value={planPrice}
                    onChange={(e) => setPlanPrice(e.target.value)}
                    placeholder="e.g. $49"
                    className="w-full px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">Period (optional)</label>
                  <input
                    type="text"
                    value={planPeriod}
                    onChange={(e) => setPlanPeriod(e.target.value)}
                    placeholder="e.g. /month"
                    className="w-full px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-900 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={planDesc}
                  onChange={(e) => setPlanDesc(e.target.value)}
                  placeholder="Short marketing description..."
                  className="w-full px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-900 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">Features (One per line)</label>
                <textarea
                  rows={4}
                  required
                  value={planFeatures}
                  onChange={(e) => setPlanFeatures(e.target.value)}
                  placeholder="1 Storefront Tenant&#10;Unlimited products&#10;Sales Analytics"
                  className="w-full px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-900 focus:outline-none font-mono"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="planIsPopular"
                  checked={planIsPopular}
                  onChange={(e) => setPlanIsPopular(e.target.checked)}
                  className="w-4 h-4 text-purple-600 border-zinc-300 rounded focus:ring-purple-500"
                />
                <label htmlFor="planIsPopular" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 select-none cursor-pointer">
                  Feature this plan (Most Popular badge)
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">CTA Button Text</label>
                  <input
                    type="text"
                    required
                    value={planButtonText}
                    onChange={(e) => setPlanButtonText(e.target.value)}
                    className="w-full px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">CTA Button Link</label>
                  <input
                    type="text"
                    required
                    value={planButtonLink}
                    onChange={(e) => setPlanButtonLink(e.target.value)}
                    className="w-full px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsPricingModalOpen(false)}
                  className="flex-1 py-3 sm:py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm sm:text-xs font-semibold rounded-xl transition-all cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 py-3 sm:py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-sm sm:text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md shadow-purple-900/10"
                >
                  {editingPricingPlan ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
