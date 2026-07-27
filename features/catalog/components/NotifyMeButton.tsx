"use client";

import React, { useState, useTransition } from "react";
import { subscribeProductWaitlistAction } from "@/features/catalog/waitlist.actions";
import { toast } from "sonner";

export default function NotifyMeButton({
  productId,
  productName,
  initialUserEmail,
}: {
  productId: string;
  productName: string;
  initialUserEmail?: string;
}) {
  const [email, setEmail] = useState(initialUserEmail || "");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await subscribeProductWaitlistAction({ productId, email });
        if (res?.data?.success) {
          setIsSubscribed(true);
          setMessage(res.data.message);
          toast.success(res.data.message);
        } else {
          toast.error(res?.serverError || "Failed to join waitlist.");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to join waitlist.");
      }
    });
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-blue-500/10 border border-blue-500/25 dark:bg-blue-950/30 dark:border-blue-800/40 space-y-3.5">
      <div className="flex items-center gap-2.5">
        <span className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm font-bold">
          🔔
        </span>
        <div>
          <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300">
            Coming Soon — Price & Stock TBA
          </h4>
          <p className="text-xs text-blue-700 dark:text-blue-400">
            Get notified as soon as pricing and launch availability are published.
          </p>
        </div>
      </div>

      {isSubscribed ? (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <span>✓</span>
          <span>{message}</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address..."
            required
            className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 font-medium"
          />
          <button
            type="submit"
            disabled={isPending}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isPending ? "Subscribing..." : "Notify Me"}
          </button>
        </form>
      )}
    </div>
  );
}
