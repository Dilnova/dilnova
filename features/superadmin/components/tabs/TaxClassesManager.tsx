"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createTaxClassAction,
  updateTaxClassAction,
  deleteTaxClassAction,
} from "@/features/catalog/superadmin.actions";
import { useConfirm } from "@/shared/ui/notifications";
import { AccessibleModal } from "@/shared/ui/AccessibleModal";

export interface TaxClassItem {
  id: string;
  name: string;
  code: string;
  ratePercent: number;
}

interface TaxClassesManagerProps {
  taxClasses: TaxClassItem[];
}

export default function TaxClassesManager({ taxClasses }: TaxClassesManagerProps) {
  const [isPending, startTransition] = useTransition();
  const { confirmAction } = useConfirm();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTaxClass, setEditingTaxClass] = useState<TaxClassItem | null>(null);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [ratePercent, setRatePercent] = useState<number>(0);

  const handleNameChange = (val: string) => {
    setName(val);
    const derived = name.toUpperCase().replace(/[^A-Z0-9_]+/g, "_");
    if (!code || code === derived) {
      setCode(val.toUpperCase().replace(/[^A-Z0-9_]+/g, "_"));
    }
  };

  const handleCreateTaxClass = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const res = await createTaxClassAction({
          name,
          code: code.toUpperCase().trim(),
          ratePercent,
        });

        if (res?.data?.success) {
          toast.success(`Tax class "${name}" (${ratePercent}%) created successfully!`);
          setIsCreateModalOpen(false);
          setName("");
          setCode("");
          setRatePercent(0);
        } else {
          toast.error(res?.serverError || "Failed to create custom tax class.");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "An error occurred.");
      }
    });
  };

  const handleOpenEdit = (tc: TaxClassItem) => {
    setEditingTaxClass(tc);
    setName(tc.name);
    setCode(tc.code);
    setRatePercent(tc.ratePercent);
  };

  const handleUpdateTaxClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTaxClass) return;

    startTransition(async () => {
      try {
        const res = await updateTaxClassAction({
          id: editingTaxClass.id,
          name,
          code: code.toUpperCase().trim(),
          ratePercent,
        });

        if (res?.data?.success) {
          toast.success(`Tax class "${name}" updated successfully!`);
          setEditingTaxClass(null);
          setName("");
          setCode("");
          setRatePercent(0);
        } else {
          toast.error(res?.serverError || "Failed to update tax class.");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "An error occurred.");
      }
    });
  };

  const handleDeleteTaxClass = async (tc: TaxClassItem) => {
    const confirmed = await confirmAction({
      title: `Delete Tax Class "${tc.name}"?`,
      message: `Are you sure you want to delete "${tc.name}" (${tc.ratePercent}%)? Products using this tax class will fall back to default tax.`,
      confirmText: "Delete Tax Class",
      variant: "danger",
    });

    if (confirmed) {
      startTransition(async () => {
        try {
          const res = await deleteTaxClassAction({ id: tc.id });
          if (res?.data?.success) {
            toast.success(`Tax class "${tc.name}" deleted.`);
          } else {
            toast.error(res?.serverError || "Failed to delete tax class.");
          }
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "An error occurred.");
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h3 className="text-lg font-extrabold text-zinc-900 dark:text-zinc-100 font-sans flex items-center gap-2">
            🏷️ Platform Tax Classes & Custom Rates
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
            Manage tax rules available across all vendor storefronts, category overrides, and POS
            registers.
          </p>
        </div>
        <button
          onClick={() => {
            setName("");
            setCode("");
            setRatePercent(0);
            setIsCreateModalOpen(true);
          }}
          className="px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md shadow-purple-900/20 active:scale-[0.98] shrink-0 self-start sm:self-center"
        >
          + Add Custom Tax Class
        </button>
      </div>

      {/* Tax Classes List Table */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {taxClasses.map((tc) => (
          <div
            key={tc.id}
            className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between shadow-sm"
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100">
                  {tc.name}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                  {tc.ratePercent}%
                </span>
              </div>
              <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
                Code: {tc.code}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => handleOpenEdit(tc)}
                disabled={isPending}
                className="text-zinc-400 hover:text-purple-600 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer text-xs"
                title="Edit tax class"
              >
                ✏️
              </button>

              <button
                onClick={() => handleDeleteTaxClass(tc)}
                disabled={isPending}
                className="text-zinc-400 hover:text-red-500 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer text-xs"
                title="Delete tax class"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Tax Class Modal */}
      {isCreateModalOpen && (
        <AccessibleModal
          isOpen={true}
          onClose={() => setIsCreateModalOpen(false)}
          backdropClassName="bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 w-full sm:max-w-md shadow-2xl safe-area-bottom"
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
              Add Custom Tax Class
            </h2>
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-500 transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleCreateTaxClass} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                Tax Class Name
              </label>
              <input
                required
                type="text"
                maxLength={50}
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                placeholder="e.g. Retail Luxury Tax"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                Tax System Code (UPPERCASE)
              </label>
              <input
                required
                type="text"
                maxLength={30}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-mono text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                placeholder="e.g. LUXURY_15"
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
                value={ratePercent}
                onChange={(e) => setRatePercent(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-mono bg-zinc-50 dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                placeholder="15.0"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isPending}
                className="w-full py-3.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl transition-all cursor-pointer shadow-md shadow-purple-900/20 active:scale-[0.98] disabled:opacity-50"
              >
                {isPending ? "Creating Tax Class..." : "Create Tax Class"}
              </button>
            </div>
          </form>
        </AccessibleModal>
      )}

      {/* Edit Tax Class Modal */}
      {editingTaxClass && (
        <AccessibleModal
          isOpen={true}
          onClose={() => setEditingTaxClass(null)}
          backdropClassName="bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 w-full sm:max-w-md shadow-2xl safe-area-bottom"
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
              Edit Tax Class
            </h2>
            <button
              onClick={() => setEditingTaxClass(null)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-500 transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleUpdateTaxClass} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                Tax Class Name
              </label>
              <input
                required
                type="text"
                maxLength={50}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500/40 font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                Tax System Code
              </label>
              <input
                required
                type="text"
                maxLength={30}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-mono text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
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
                value={ratePercent}
                onChange={(e) => setRatePercent(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-mono bg-zinc-50 dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500/40 font-bold"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isPending}
                className="w-full py-3.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl transition-all cursor-pointer shadow-md shadow-purple-900/20 active:scale-[0.98] disabled:opacity-50"
              >
                {isPending ? "Saving Changes..." : "Save Tax Class Changes"}
              </button>
            </div>
          </form>
        </AccessibleModal>
      )}
    </div>
  );
}
