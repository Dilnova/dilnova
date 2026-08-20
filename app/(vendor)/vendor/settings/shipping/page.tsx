"use client";

import { useState, useEffect, useTransition } from "react";
import { Truck, Save, ShieldCheck, Info, CheckCircle2, Loader2 } from "lucide-react";
import {
  getVendorShippingRules,
  saveVendorShippingRules,
  type ShippingRuleInput,
} from "@/features/billing/shipping.actions";

const DEFAULT_FORM_RULES: ShippingRuleInput[] = [
  { zone: "western", baseAmountCents: 35000, perKgCents: 5000, estimatedDays: 2 },
  { zone: "domestic", baseAmountCents: 55000, perKgCents: 8000, estimatedDays: 3 },
  { zone: "asia", baseAmountCents: 350000, perKgCents: 50000, estimatedDays: 5 },
  { zone: "europe", baseAmountCents: 600000, perKgCents: 120000, estimatedDays: 7 },
  { zone: "us_canada", baseAmountCents: 700000, perKgCents: 150000, estimatedDays: 6 },
  { zone: "rest_of_world", baseAmountCents: 550000, perKgCents: 100000, estimatedDays: 8 },
];

const ZONE_LABELS: Record<
  string,
  { title: string; desc: string; type: "domestic" | "international" }
> = {
  western: {
    title: "Western Province (Local)",
    desc: "Colombo, Gampaha, Kalutara districts",
    type: "domestic",
  },
  domestic: {
    title: "Sri Lanka Outstation",
    desc: "All other 22 districts across Sri Lanka",
    type: "domestic",
  },
  asia: {
    title: "Asia Region",
    desc: "India, Singapore, UAE, Japan, China, etc.",
    type: "international",
  },
  europe: {
    title: "Europe Region",
    desc: "UK, Germany, France, Italy, Sweden, etc.",
    type: "international",
  },
  us_canada: { title: "US & Canada", desc: "United States and Canada", type: "international" },
  rest_of_world: {
    title: "Rest of World",
    desc: "All other international destinations",
    type: "international",
  },
};

export default function VendorShippingSettingsPage() {
  const [isPending, startTransition] = useTransition();
  const [rules, setRules] = useState<ShippingRuleInput[]>(DEFAULT_FORM_RULES);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    getVendorShippingRules().then((dbRules) => {
      if (dbRules.length > 0) {
        setRules((prev) =>
          prev.map((p) => {
            const match = dbRules.find((r) => r.zone === p.zone);
            return match
              ? {
                  zone: match.zone,
                  baseAmountCents: match.baseAmountCents,
                  perKgCents: match.perKgCents,
                  estimatedDays: match.estimatedDays,
                }
              : p;
          }),
        );
      }
    });
  }, []);

  const handleChange = (
    zone: string,
    field: "baseAmountCents" | "perKgCents" | "estimatedDays",
    val: number,
  ) => {
    setRules((prev) => prev.map((r) => (r.zone === zone ? { ...r, [field]: val } : r)));
    setSavedSuccess(false);
  };

  const handleSave = () => {
    startTransition(async () => {
      await saveVendorShippingRules(rules);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
            <Truck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Vendor Shipping Settings
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Configure your store&apos;s custom delivery rates for Sri Lanka districts and
              international zones.
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={isPending}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-all shadow-md hover:shadow-indigo-500/20"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving Rules...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" /> Save Shipping Rates
            </>
          )}
        </button>
      </div>

      {savedSuccess && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Shipping rates updated successfully!
        </div>
      )}

      <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-3">
        <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block mb-0.5">
            Store Origin Address & Distance-Based Courier Rates
          </span>
          <span>
            Speed Post Courier rates (Metro, Same Province, Outstation) are calculated dynamically
            using your primary store branch location. Ensure your store branch address (City,
            Province/District) is configured in your organization branch details for precise rate
            quotes.
          </span>
        </div>
      </div>

      {/* Sri Lanka Domestic Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm mb-8">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-indigo-500" /> Sri Lanka Domestic Rates
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
          Set base delivery costs and extra weight charges per district zone.
        </p>

        <div className="space-y-4">
          {rules
            .filter((r) => ZONE_LABELS[r.zone]?.type === "domestic")
            .map((rule) => {
              const meta = ZONE_LABELS[rule.zone];
              return (
                <div
                  key={rule.zone}
                  className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 grid grid-cols-1 md:grid-cols-4 gap-4 items-center"
                >
                  <div className="md:col-span-1">
                    <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {meta?.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{meta?.desc}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase block mb-1">
                      Base Rate (LKR)
                    </label>
                    <input
                      type="number"
                      value={rule.baseAmountCents / 100}
                      onChange={(e) =>
                        handleChange(
                          rule.zone,
                          "baseAmountCents",
                          Math.round(parseFloat(e.target.value || "0") * 100),
                        )
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase block mb-1">
                      Extra per KG (LKR)
                    </label>
                    <input
                      type="number"
                      value={rule.perKgCents / 100}
                      onChange={(e) =>
                        handleChange(
                          rule.zone,
                          "perKgCents",
                          Math.round(parseFloat(e.target.value || "0") * 100),
                        )
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase block mb-1">
                      Est. Days
                    </label>
                    <input
                      type="number"
                      value={rule.estimatedDays}
                      onChange={(e) =>
                        handleChange(
                          rule.zone,
                          "estimatedDays",
                          parseInt(e.target.value || "1", 10),
                        )
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* International Rates Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-2">
          <Info className="h-4 w-4 text-indigo-500" /> International Delivery Rates
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
          Set international shipping pricing for global customers.
        </p>

        <div className="space-y-4">
          {rules
            .filter((r) => ZONE_LABELS[r.zone]?.type === "international")
            .map((rule) => {
              const meta = ZONE_LABELS[rule.zone];
              return (
                <div
                  key={rule.zone}
                  className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 grid grid-cols-1 md:grid-cols-4 gap-4 items-center"
                >
                  <div className="md:col-span-1">
                    <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {meta?.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{meta?.desc}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase block mb-1">
                      Base Rate (LKR)
                    </label>
                    <input
                      type="number"
                      value={rule.baseAmountCents / 100}
                      onChange={(e) =>
                        handleChange(
                          rule.zone,
                          "baseAmountCents",
                          Math.round(parseFloat(e.target.value || "0") * 100),
                        )
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase block mb-1">
                      Extra per KG (LKR)
                    </label>
                    <input
                      type="number"
                      value={rule.perKgCents / 100}
                      onChange={(e) =>
                        handleChange(
                          rule.zone,
                          "perKgCents",
                          Math.round(parseFloat(e.target.value || "0") * 100),
                        )
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase block mb-1">
                      Est. Days
                    </label>
                    <input
                      type="number"
                      value={rule.estimatedDays}
                      onChange={(e) =>
                        handleChange(
                          rule.zone,
                          "estimatedDays",
                          parseInt(e.target.value || "1", 10),
                        )
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
