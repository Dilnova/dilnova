"use client";

import React, { useState } from "react";
import { sendShippingQuoteAction } from "../actions";
import { Truck, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ShippingQuoteCardProps {
  conversationId: string;
  defaultCurrency?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function ShippingQuoteCard({
  conversationId,
  defaultCurrency = "LKR",
  onSuccess,
  onCancel,
}: ShippingQuoteCardProps) {
  const [feeDisplay, setFeeDisplay] = useState("");
  const currency = defaultCurrency;
  const [carrier, setCarrier] = useState("");
  const [zone, setZone] = useState("");
  const [estimatedDays, setEstimatedDays] = useState("3");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const numericFee = parseFloat(feeDisplay);
    if (isNaN(numericFee) || numericFee < 0) {
      toast.error("Please enter a valid shipping fee amount.");
      return;
    }

    const feeCents = Math.round(numericFee * 100);

    setIsSubmitting(true);
    try {
      const res = await sendShippingQuoteAction({
        conversationId,
        fee: feeCents,
        currency,
        carrier: carrier.trim() || undefined,
        zone: zone.trim() || undefined,
        estimatedDays: parseInt(estimatedDays, 10) || 3,
        notes: notes.trim() || undefined,
      });

      if (res?.data?.success) {
        toast.success("Shipping quote sent to customer!");
        onSuccess?.();
      } else {
        toast.error(res?.serverError || "Failed to send shipping quote.");
      }
    } catch {
      toast.error("An unexpected error occurred while sending quote.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-purple-200 dark:border-purple-900/60 rounded-2xl p-4 shadow-lg mb-3 animate-fade-in">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800 mb-3">
        <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400 font-bold text-sm">
          <Truck className="w-4 h-4" />
          <span>Send Official Shipping Fee Quote</span>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Shipping Fee Amount *
            </label>
            <div className="relative flex rounded-xl border border-zinc-300 dark:border-zinc-700 overflow-hidden focus-within:ring-2 focus-within:ring-purple-500">
              <span className="inline-flex items-center px-2.5 bg-zinc-100 dark:bg-zinc-800 text-xs font-bold text-zinc-500">
                {currency}
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="500.00"
                value={feeDisplay}
                onChange={(e) => setFeeDisplay(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-transparent focus:outline-hidden font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Estimated Delivery (Days)
            </label>
            <input
              type="number"
              min="1"
              max="90"
              value={estimatedDays}
              onChange={(e) => setEstimatedDays(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500 font-mono"
              placeholder="3"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Carrier / Courier
            </label>
            <input
              type="text"
              placeholder="e.g. Pronto, PromptX, DHL"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Delivery Zone / Region
            </label>
            <input
              type="text"
              placeholder="e.g. Western Province, Islandwide"
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
            Special Delivery Notes / Instructions (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Cash on delivery accepted for shipping portion"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting || !feeDisplay}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 disabled:opacity-50 rounded-xl transition shadow-xs cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Truck className="w-3.5 h-3.5" />
                <span>Send Quote</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
