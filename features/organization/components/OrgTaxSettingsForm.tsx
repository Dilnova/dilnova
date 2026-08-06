"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  updateOrgDefaultTaxAction,
  deleteOrgCustomTaxAction,
  updateOrgCustomTaxAction,
} from "@/features/organization/org-currency.actions";
import { useConfirm } from "@/shared/ui/notifications";
import { AccessibleModal } from "@/shared/ui/AccessibleModal";

interface TaxClassOption {
  id: string;
  name: string;
  code: string;
  ratePercent: number;
  orgId?: string | null;
}

interface OrgTaxSettingsFormProps {
  orgId: string;
  currentDefaultTaxClassId: string | null;
  currentAllowedTaxClassIds?: string[];
  taxClasses: TaxClassOption[];
}

export default function OrgTaxSettingsForm({
  orgId,
  currentDefaultTaxClassId,
  currentAllowedTaxClassIds,
  taxClasses,
}: OrgTaxSettingsFormProps) {
  const [isPending, startTransition] = useTransition();
  const { confirmAction } = useConfirm();

  const [selectedTaxClassId, setSelectedTaxClassId] = useState<string>(
    currentDefaultTaxClassId || "",
  );

  // New Custom Tax Creation Form State
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [newTaxName, setNewTaxName] = useState<string>("");
  const [newTaxRate, setNewTaxRate] = useState<string>("");

  const [allowedIds, setAllowedIds] = useState<string[]>(
    currentAllowedTaxClassIds ?? taxClasses.map((tc) => tc.id),
  );

  const [editingCustomTax, setEditingCustomTax] = useState<TaxClassOption | null>(null);
  const [editName, setEditName] = useState("");
  const [editRate, setEditRate] = useState(0);

  const toggleAllowedTaxClass = (id: string) => {
    setAllowedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSelectAll = () => {
    setAllowedIds(taxClasses.map((tc) => tc.id));
  };

  const handleClearAll = () => {
    setAllowedIds([]);
  };

  // Dedicated Action: Create Custom Tax Rate
  const handleCreateCustomTax = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedRate = parseFloat(newTaxRate);
    if (isNaN(parsedRate) || parsedRate < 0 || parsedRate > 100) {
      toast.error("Please enter a valid tax percentage between 0 and 100.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await updateOrgDefaultTaxAction({
          organizationId: orgId,
          customTaxName: newTaxName.trim() || undefined,
          customTaxRatePercent: parsedRate,
          allowedTaxClassIds: allowedIds,
        });

        if (res?.data?.success) {
          toast.success(`Custom Tax "${newTaxName || `Custom Tax (${parsedRate}%)`}" created!`);
          setNewTaxName("");
          setNewTaxRate("");
          setIsAddingCustom(false);
        } else {
          toast.error(res?.serverError || "Failed to create custom tax rate.");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "An error occurred.");
      }
    });
  };

  const handleOpenEditCustom = (tc: TaxClassOption) => {
    setEditingCustomTax(tc);
    setEditName(tc.name);
    setEditRate(tc.ratePercent);
  };

  const handleSaveEditCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomTax) return;

    startTransition(async () => {
      try {
        const res = await updateOrgCustomTaxAction({
          organizationId: orgId,
          taxClassId: editingCustomTax.id,
          name: editName,
          ratePercent: editRate,
        });

        if (res?.data?.success) {
          toast.success("Custom tax rate updated!");
          setEditingCustomTax(null);
        } else {
          toast.error(res?.serverError || "Failed to update custom tax rate.");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "An error occurred.");
      }
    });
  };

  const handleDeleteCustomTax = async (tc: TaxClassOption) => {
    const confirmed = await confirmAction({
      title: `Delete Custom Tax "${tc.name}"?`,
      message: `Are you sure you want to remove "${tc.name}" (${tc.ratePercent}%) from your store?`,
      confirmText: "Delete Custom Tax",
      variant: "danger",
    });

    if (confirmed) {
      startTransition(async () => {
        try {
          const res = await deleteOrgCustomTaxAction({
            organizationId: orgId,
            taxClassId: tc.id,
          });

          if (res?.data?.success) {
            toast.success(`Custom tax "${tc.name}" deleted.`);
          } else {
            toast.error(res?.serverError || "Failed to delete custom tax.");
          }
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "An error occurred.");
        }
      });
    }
  };

  const handleSaveStoreTaxSettings = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const res = await updateOrgDefaultTaxAction({
          organizationId: orgId,
          defaultTaxClassId: selectedTaxClassId || null,
          allowedTaxClassIds: allowedIds,
        });

        if (res?.data?.success) {
          toast.success("Store default tax and allowed member tax options saved!");
        } else {
          toast.error(res?.serverError || "Failed to save tax settings.");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "An error occurred.");
      }
    });
  };

  const orgCustomTaxes = taxClasses.filter((tc) => tc.orgId === orgId);

  return (
    <div className="space-y-6 max-w-xl">
      {/* 1. Store Default Tax Class Selection */}
      <form onSubmit={handleSaveStoreTaxSettings} className="space-y-6">
        <div className="space-y-2">
          <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
            Store Default Tax Setting (Level 3 Fallback)
          </label>
          <select
            id="store-default-tax"
            value={selectedTaxClassId}
            onChange={(e) => setSelectedTaxClassId(e.target.value)}
            className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-600 font-semibold"
          >
            <option value="">No Store Default (Default 0% Tax)</option>
            {taxClasses.map((tc) => (
              <option key={tc.id} value={tc.id}>
                {tc.name} ({tc.ratePercent}%) {tc.orgId ? "⭐️ (Store Custom)" : ""}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Select an existing system or custom tax class for your store default.
          </p>
        </div>

        {/* 2. Allowed Tax Options Restriction for Org Members & POS Staff */}
        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                🔒 Allowed Tax Options for Org Members & POS Staff
              </h4>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed mt-0.5">
                Select which tax classes your store members can pick when adding items or at
                checkout.
              </p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-purple-650 hover:underline cursor-pointer"
              >
                Select All
              </button>
              <span className="text-zinc-300 dark:text-zinc-700">|</span>
              <button
                type="button"
                onClick={handleClearAll}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                Allow All
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
            {taxClasses.map((tc) => {
              const isChecked = allowedIds.includes(tc.id);
              return (
                <label
                  key={tc.id}
                  className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer ${
                    isChecked
                      ? "bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800 text-purple-900 dark:text-purple-200 font-bold"
                      : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleAllowedTaxClass(tc.id)}
                    className="rounded border-zinc-300 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs truncate">
                    {tc.name}{" "}
                    <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 font-extrabold ml-1">
                      ({tc.ratePercent}%)
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="w-full sm:w-auto px-6 py-3 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md shadow-purple-900/20 active:scale-[0.98] disabled:opacity-50"
          >
            {isPending ? "Saving Tax Settings..." : "Save Store Tax Settings"}
          </button>
        </div>
      </form>

      {/* 3. Dedicated Create Custom Tax Rate Section */}
      <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
              ➕ Add New Store Custom Tax Rate
            </h4>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              Create a custom tax rate for your store. Once created, it will appear in the default
              tax dropdown above.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddingCustom(!isAddingCustom)}
            className="px-3 py-1.5 text-xs font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/60 transition-all cursor-pointer"
          >
            {isAddingCustom ? "Cancel" : "✏️ Create Tax Rate"}
          </button>
        </div>

        {isAddingCustom && (
          <form
            onSubmit={handleCreateCustomTax}
            className="p-4 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/40 dark:bg-purple-950/20 space-y-3"
          >
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                Tax Label / Name
              </label>
              <input
                required
                type="text"
                maxLength={50}
                value={newTaxName}
                onChange={(e) => setNewTaxName(e.target.value)}
                placeholder="e.g. Provincial Retail Tax"
                className="w-full px-3.5 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm font-bold bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                Tax Rate Percentage (%)
              </label>
              <div className="relative">
                <input
                  required
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={newTaxRate}
                  onChange={(e) => setNewTaxRate(e.target.value)}
                  placeholder="e.g. 12.5"
                  className="w-full px-3.5 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs sm:text-sm font-mono text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-600 font-bold"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-400 font-bold">
                  %
                </span>
              </div>
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={isPending}
                className="w-full sm:w-auto px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm active:scale-[0.98] disabled:opacity-50"
              >
                {isPending ? "Creating..." : "Save New Tax Rate"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 4. Manage Store's Own Custom Tax Rates */}
      {orgCustomTaxes.length > 0 && (
        <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
          <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
            🏷️ Store&apos;s Custom Tax Rates
          </h4>
          <div className="space-y-2">
            {orgCustomTaxes.map((tc) => (
              <div
                key={tc.id}
                className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between"
              >
                <div>
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    {tc.name}
                  </span>
                  <span className="ml-2 text-xs font-mono font-extrabold text-purple-700 dark:text-purple-300">
                    ({tc.ratePercent}%)
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEditCustom(tc)}
                    className="p-1.5 text-xs text-zinc-400 hover:text-purple-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
                    title="Edit custom tax"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDeleteCustomTax(tc)}
                    className="p-1.5 text-xs text-zinc-400 hover:text-red-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
                    title="Delete custom tax"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Custom Tax Modal */}
      {editingCustomTax && (
        <AccessibleModal
          isOpen={true}
          onClose={() => setEditingCustomTax(null)}
          backdropClassName="bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 w-full sm:max-w-md shadow-2xl safe-area-bottom"
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
              Edit Custom Tax Rate
            </h2>
            <button
              onClick={() => setEditingCustomTax(null)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-500 transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSaveEditCustom} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                Tax Label / Name
              </label>
              <input
                required
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-600 font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                Tax Rate Percentage (%)
              </label>
              <input
                required
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={editRate}
                onChange={(e) => setEditRate(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-mono bg-zinc-50 dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-600 font-bold"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isPending}
                className="w-full py-3.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl transition-all cursor-pointer shadow-md shadow-purple-900/20 active:scale-[0.98] disabled:opacity-50"
              >
                {isPending ? "Saving..." : "Save Custom Tax Rate"}
              </button>
            </div>
          </form>
        </AccessibleModal>
      )}
    </div>
  );
}
