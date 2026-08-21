"use client";

import React, { useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";

export default function DilstarNewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    // Simulate brief network submission
    setTimeout(() => {
      setStatus("success");
      setEmail("");
    }, 600);
  };

  if (status === "success") {
    return (
      <div className="mt-6 flex items-center justify-center gap-2 p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-700 text-emerald-300 text-xs font-semibold max-w-md mx-auto animate-in fade-in">
        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>Thank you for subscribing! We&apos;ll keep you updated with exclusive offers.</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email address..."
        className="flex-1 px-4 py-3 rounded-xl bg-zinc-950/80 border border-zinc-700 text-white placeholder:text-zinc-500 text-xs focus:outline-none focus:ring-2 focus:ring-[#1565D8]"
        required
        disabled={status === "loading"}
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#1565D8] to-[#0B4F5C] text-white font-bold text-xs hover:opacity-95 transition-opacity shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {status === "loading" ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Subscribing...</span>
          </>
        ) : (
          "Subscribe"
        )}
      </button>
    </form>
  );
}
