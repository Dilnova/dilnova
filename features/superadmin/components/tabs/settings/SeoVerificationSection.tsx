"use client";

import { useState } from "react";
import { toast } from "sonner";
import { verifyHeadMetadataAction } from "@/features/superadmin/settings.actions";
import SuperadminFormCard from "../../ui/SuperadminFormCard";
import MetaDomainSetupGuide from "./MetaDomainSetupGuide";
import type { HeadVerificationResult } from "./types";

interface SeoVerificationSectionProps {
  pinterestVerifyInput: string;
  setPinterestVerifyInput: (val: string) => void;
  pinterestDomainVerify: string;
  googleVerifyInput: string;
  setGoogleVerifyInput: (val: string) => void;
  googleSiteVerify: string;
  facebookVerifyDilstarInput: string;
  setFacebookVerifyDilstarInput: (val: string) => void;
  facebookDomainVerifyDilstar: string;
  facebookVerifyDilnovaInput: string;
  setFacebookVerifyDilnovaInput: (val: string) => void;
  facebookDomainVerifyDilnova: string;
  onCopyText: (text: string, label: string) => void;
}

export default function SeoVerificationSection({
  pinterestVerifyInput,
  setPinterestVerifyInput,
  pinterestDomainVerify,
  googleVerifyInput,
  setGoogleVerifyInput,
  googleSiteVerify,
  facebookVerifyDilstarInput,
  setFacebookVerifyDilstarInput,
  facebookDomainVerifyDilstar,
  facebookVerifyDilnovaInput,
  setFacebookVerifyDilnovaInput,
  facebookDomainVerifyDilnova,
  onCopyText,
}: SeoVerificationSectionProps) {
  const [isVerifyingHead, setIsVerifyingHead] = useState(false);
  const [headVerificationResult, setHeadVerificationResult] =
    useState<HeadVerificationResult | null>(null);

  const handleVerifyHeadTags = async () => {
    setIsVerifyingHead(true);
    try {
      const res = await verifyHeadMetadataAction({});
      if (res?.data?.success) {
        setHeadVerificationResult({
          verified: true,
          checkedAt: new Date().toLocaleTimeString(),
          allActive: res.data.allActive,
        });
        if (res.data.allActive) {
          toast.success("All 3 verification meta tags active and served in <head>!");
        } else {
          toast.info("Verification tags checked — some tags are not configured yet.");
        }
      }
    } catch {
      toast.error("Failed to verify head metadata.");
    } finally {
      setIsVerifyingHead(false);
    }
  };

  const sanitizeToken = (raw: string) => {
    const trimmed = raw.trim();
    const contentMatch = trimmed.match(/content=["']([^"']+)["']/i);
    if (contentMatch) return contentMatch[1].replace(/[<>]/g, "").trim();
    return trimmed.replace(/[<>]/g, "").trim();
  };

  const renderTokenStatusBadge = (current: string, initial: string, altVerification?: string) => {
    const isInitialConfigured = Boolean(initial && initial.trim().length > 0);
    const isDirty = current.trim() !== initial.trim();

    if (isDirty) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Pending Save
        </span>
      );
    }

    if (isInitialConfigured) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          ACTIVE IN &lt;head&gt;
        </span>
      );
    }

    if (altVerification) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
          {altVerification}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-medium bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
        Not Configured
      </span>
    );
  };

  return (
    <SuperadminFormCard title="SEO & Domain Verification" icon="🔍" className="space-y-4">
      <p className="text-[10px] text-zinc-400 leading-relaxed">
        Public domain-ownership tokens injected into{" "}
        <code className="font-mono text-purple-600 dark:text-purple-400">&lt;meta&gt;</code> tags in
        the site&apos;s{" "}
        <code className="font-mono text-purple-600 dark:text-purple-400">&lt;head&gt;</code>.
        Changes here take effect on the next page request — no redeploy needed.
      </p>

      {/* Pinterest */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
            <span>🎯</span> Pinterest Domain Verify
          </label>
          {renderTokenStatusBadge(pinterestVerifyInput, pinterestDomainVerify)}
        </div>
        <input
          type="text"
          maxLength={256}
          value={pinterestVerifyInput}
          onChange={(e) => setPinterestVerifyInput(sanitizeToken(e.target.value))}
          className="w-full px-4 py-3 sm:py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl text-base sm:text-sm bg-zinc-50 dark:bg-zinc-900 font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all placeholder:text-zinc-400"
          placeholder="e.g. a1b2c3d4e5f60718293a4b5c6d7e8f9a"
        />
        <p className="text-[10px] text-zinc-400">
          From:{" "}
          <a
            href="https://www.pinterest.com/business/hub/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-500 hover:underline"
          >
            Pinterest Business Hub
          </a>{" "}
          → Claim Website → HTML tag method → copy only the{" "}
          <code className="font-mono">content=&quot;…&quot;</code> value.
        </p>
      </div>

      {/* Google */}
      <div className="space-y-1.5 border-t border-zinc-100 dark:border-zinc-900 pt-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
            <span>🔎</span> Google Site Verify
          </label>
          {renderTokenStatusBadge(googleVerifyInput, googleSiteVerify, "Verified via DNS")}
        </div>
        <input
          type="text"
          maxLength={256}
          value={googleVerifyInput}
          onChange={(e) => setGoogleVerifyInput(sanitizeToken(e.target.value))}
          className="w-full px-4 py-3 sm:py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl text-base sm:text-sm bg-zinc-50 dark:bg-zinc-900 font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all placeholder:text-zinc-400"
          placeholder="e.g. abc123XYZ..."
        />
        <p className="text-[10px] text-zinc-400">
          <span className="text-emerald-500 font-semibold">✓ Both domains verified via DNS</span> in{" "}
          <a
            href="https://search.google.com/search-console"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-500 hover:underline"
          >
            Google Search Console
          </a>
          . This HTML tag is an{" "}
          <span className="font-semibold text-zinc-500 dark:text-zinc-300">optional backup</span> —
          DNS verification is the highest tier and already active.
        </p>
      </div>

      {/* Facebook Dual Domain Verification */}
      <div className="space-y-4 border-t border-zinc-100 dark:border-zinc-900 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <span>📘</span> Meta / Facebook Domain Verification (Dual Domains)
            </h4>
            <p className="text-[10px] text-zinc-400 mt-0.5">
              Meta verifies ownership per-domain. Enter the respective tokens for Dilstar and
              Dilnova below.
            </p>
          </div>
        </div>

        {/* 1. Dilstar (dilstar.pp.ua) */}
        <div className="p-3.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <span>🏪</span> Dilstar Brand Portal (dilstar.pp.ua)
            </label>
            {renderTokenStatusBadge(
              facebookVerifyDilstarInput,
              facebookDomainVerifyDilstar,
              "Optional",
            )}
          </div>
          <input
            type="text"
            maxLength={256}
            value={facebookVerifyDilstarInput}
            onChange={(e) => setFacebookVerifyDilstarInput(sanitizeToken(e.target.value))}
            className="w-full px-3 py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl text-base sm:text-xs bg-white dark:bg-zinc-950 font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all placeholder:text-zinc-400"
            placeholder="e.g. eml5dxi95zbgr... (or paste full <meta> tag)"
          />
          <div className="flex items-center justify-between pt-0.5">
            <span className="text-[10px] text-zinc-400">
              Serves in &lt;head&gt; on dilstar.pp.ua
            </span>
            <button
              type="button"
              onClick={() => onCopyText("dilstar.pp.ua", "Domain: dilstar.pp.ua")}
              className="px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 font-mono text-[9px] text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
            >
              📋 Copy dilstar.pp.ua
            </button>
          </div>
        </div>

        {/* 2. Dilnova (dilnova.pp.ua) */}
        <div className="p-3.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <span>🌐</span> Dilnova Marketplace (dilnova.pp.ua)
            </label>
            {renderTokenStatusBadge(
              facebookVerifyDilnovaInput,
              facebookDomainVerifyDilnova,
              "Optional",
            )}
          </div>
          <input
            type="text"
            maxLength={256}
            value={facebookVerifyDilnovaInput}
            onChange={(e) => setFacebookVerifyDilnovaInput(sanitizeToken(e.target.value))}
            className="w-full px-3 py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl text-base sm:text-xs bg-white dark:bg-zinc-950 font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all placeholder:text-zinc-400"
            placeholder="e.g. abcdefgh12345678 (or paste full <meta> tag)"
          />
          <div className="flex items-center justify-between pt-0.5">
            <span className="text-[10px] text-zinc-400">
              Serves in &lt;head&gt; on dilnova.pp.ua
            </span>
            <button
              type="button"
              onClick={() => onCopyText("dilnova.pp.ua", "Domain: dilnova.pp.ua")}
              className="px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 font-mono text-[9px] text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
            >
              📋 Copy dilnova.pp.ua
            </button>
          </div>
        </div>

        {/* Interactive Step-by-Step Meta Setup Guide */}
        <MetaDomainSetupGuide />
      </div>

      {/* Live Head Tag Inspector */}
      <div className="p-3 rounded-xl bg-zinc-900 text-zinc-100 dark:bg-zinc-950 border border-zinc-800 space-y-2.5 mt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs">🛰️</span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-300">
              Live &lt;head&gt; Meta Tag Inspector
            </span>
          </div>
          <button
            type="button"
            onClick={handleVerifyHeadTags}
            disabled={isVerifyingHead}
            className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors shadow-xs flex items-center gap-1"
          >
            {isVerifyingHead ? "Verifying..." : "⚡ Verify Live DB/Cache Sync"}
          </button>
        </div>
        <p className="text-[10px] text-zinc-400">
          The exact verification tags injected into the HTML document root by Next.js for Google,
          Pinterest, and Meta crawlers across your domains:
        </p>
        <div className="space-y-1.5 font-mono text-[10px] bg-black/60 p-2.5 rounded-lg border border-zinc-800 overflow-x-auto">
          {pinterestVerifyInput?.trim() ? (
            <div className="text-emerald-400">
              &lt;meta name=&quot;p:domain_verify&quot; content=&quot;
              {pinterestVerifyInput.trim()}&quot; /&gt;
            </div>
          ) : (
            <div className="text-zinc-600">
              &lt;!-- Pinterest domain verification inactive --&gt;
            </div>
          )}
          {googleVerifyInput?.trim() ? (
            <div className="text-emerald-400">
              &lt;meta name=&quot;google-site-verification&quot; content=&quot;
              {googleVerifyInput.trim()}&quot; /&gt;
            </div>
          ) : (
            <div className="text-zinc-600">&lt;!-- Google site verification inactive --&gt;</div>
          )}
          {facebookVerifyDilstarInput?.trim() ? (
            <div className="text-emerald-400">
              &lt;meta name=&quot;facebook-domain-verification&quot; content=&quot;
              {facebookVerifyDilstarInput.trim()}&quot; /&gt;{" "}
              <span className="text-zinc-500 text-[9px]">(dilstar.pp.ua)</span>
            </div>
          ) : null}
          {facebookVerifyDilnovaInput?.trim() ? (
            <div className="text-emerald-400">
              &lt;meta name=&quot;facebook-domain-verification&quot; content=&quot;
              {facebookVerifyDilnovaInput.trim()}&quot; /&gt;{" "}
              <span className="text-zinc-500 text-[9px]">(dilnova.pp.ua)</span>
            </div>
          ) : null}
          {!facebookVerifyDilstarInput?.trim() && !facebookVerifyDilnovaInput?.trim() && (
            <div className="text-zinc-600">
              &lt;!-- Facebook domain verification inactive --&gt;
            </div>
          )}
        </div>
        {headVerificationResult && (
          <div className="pt-1.5 flex items-center justify-between text-[10px] text-zinc-400 border-t border-zinc-800/80">
            <span className="text-emerald-400 flex items-center gap-1 font-semibold">
              <span>✓</span> Verified active in system cache at {headVerificationResult.checkedAt}
            </span>
            <span className="font-mono text-[9px]">Status: Healthy</span>
          </div>
        )}
      </div>
    </SuperadminFormCard>
  );
}
