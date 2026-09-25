"use client";

import { Pin, ExternalLink, Eye, EyeOff, Zap, Loader2, Check, Save } from "lucide-react";
import type { DiscoveredBoard, TestResult } from "./types";

interface PinterestSettingsProps {
  isPending: boolean;
  pinterestAccessToken: string;
  setPinterestAccessToken: (token: string) => void;
  hasExistingPinterestToken: boolean;
  showPinterestToken: boolean;
  setShowPinterestToken: (show: boolean) => void;
  pinterestBoardId: string;
  setPinterestBoardId: (id: string) => void;
  pinterestBoardName: string;
  setPinterestBoardName: (name: string) => void;
  discoveredBoards: DiscoveredBoard[];
  isDiscoveringBoards: boolean;
  boardDiscoveryError: string | null;
  testResult: TestResult | null;
  onDiscoverBoards: () => void;
  onSelectBoard: (board: { id: string; name: string }) => void;
  onSave: () => void;
  onTestPinterest: () => void;
}

export function PinterestSettings({
  isPending,
  pinterestAccessToken,
  setPinterestAccessToken,
  hasExistingPinterestToken,
  showPinterestToken,
  setShowPinterestToken,
  pinterestBoardId,
  setPinterestBoardId,
  pinterestBoardName,
  setPinterestBoardName,
  discoveredBoards,
  isDiscoveringBoards,
  boardDiscoveryError,
  testResult,
  onDiscoverBoards,
  onSelectBoard,
  onSave,
  onTestPinterest,
}: PinterestSettingsProps) {
  return (
    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-red-600 font-mono flex items-center gap-2">
            <Pin className="h-4 w-4" /> Pinterest Product Pins
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Automatically publish your store&apos;s products directly to your Pinterest boards with
            photos, prices, and store links.
          </p>
        </div>
        <span className="p-2 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600">
          <Pin className="h-5 w-5" />
        </span>
      </div>

      {/* Step 1: Connect Pinterest */}
      <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-red-600 text-white text-xs font-mono font-bold shrink-0">
              1
            </span>
            <div>
              <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                Get Your Pinterest Developer Access Token
              </h3>
              <p className="text-[11px] text-zinc-500">
                Generate a user token with pins and boards permissions from Pinterest Developers.
              </p>
            </div>
          </div>
          <a
            href="https://developers.pinterest.com/apps/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-all shadow-xs cursor-pointer"
          >
            Open Pinterest Developers <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400 space-y-2.5">
          <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
            <span>How to generate your token in 3 clicks:</span>
          </div>
          <ol className="list-decimal list-inside space-y-1.5 text-zinc-600 dark:text-zinc-400">
            <li>
              In your app, click the <strong>Configure</strong> tab or scroll down to the{" "}
              <strong>Generate access token</strong> section.
            </li>
            <li>
              Select these 4 scopes:
              <span className="inline-flex gap-1 flex-wrap ml-1 font-mono font-bold text-[10px] text-red-600 dark:text-red-400">
                <code>boards:read</code>, <code>pins:read</code>, <code>pins:write</code>,{" "}
                <code>user_accounts:read</code>
              </span>
            </li>
            <li>
              Click <strong>Generate token</strong> and paste the copied token below:
            </li>
          </ol>

          <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-[11px] text-amber-900 dark:text-amber-200">
            <strong>⚠️ Important:</strong> Do NOT use a Conversions API token from Pinterest Ads
            Manager (tokens starting with <code>pina_</code>). Conversions tokens only track pixel
            ad events and cannot access boards or create product pins. Generate an{" "}
            <strong>API v5 User Token</strong> inside your Developer App.
          </div>
        </div>

        <div>
          <label
            htmlFor="pinterest-access-token"
            className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block mb-1"
          >
            Pinterest API v5 Access Token
          </label>
          <div className="relative">
            <input
              id="pinterest-access-token"
              type={showPinterestToken ? "text" : "password"}
              placeholder={
                hasExistingPinterestToken
                  ? "••••••••••••••••••••••••••••••••"
                  : "Paste your Developer App token here"
              }
              aria-label="Pinterest API v5 Access Token"
              value={pinterestAccessToken}
              onChange={(e) => setPinterestAccessToken(e.target.value)}
              className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPinterestToken(!showPinterestToken)}
              aria-label={showPinterestToken ? "Hide Pinterest token" : "Show Pinterest token"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
            >
              {showPinterestToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Step 2: Auto-Discover Boards */}
      <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-red-600 text-white text-xs font-mono font-bold shrink-0">
              2
            </span>
            <div>
              <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                Auto-Discover &amp; Select Target Board
              </h3>
              <p className="text-[11px] text-zinc-500">
                Click below to fetch boards from your Pinterest account automatically.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onDiscoverBoards}
            disabled={isDiscoveringBoards || isPending}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 hover:bg-red-100 transition-all cursor-pointer disabled:opacity-50"
          >
            {isDiscoveringBoards ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Zap className="h-3.5 w-3.5" />
            )}
            🔍 Auto-Fetch My Boards
          </button>
        </div>

        {boardDiscoveryError && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300">
            {boardDiscoveryError}
          </div>
        )}

        {discoveredBoards.length > 0 && (
          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-bold text-zinc-500 block uppercase tracking-wider">
              Select your target Pinterest board:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {discoveredBoards.map((b) => {
                const isSelected = pinterestBoardId === b.id;
                return (
                  <button
                    type="button"
                    key={b.id}
                    onClick={() => onSelectBoard(b)}
                    className={`p-3 rounded-xl border transition-all text-left cursor-pointer flex items-center justify-between gap-2.5 ${
                      isSelected
                        ? "bg-red-50/90 dark:bg-red-950/50 border-red-400 dark:border-red-700 shadow-xs ring-2 ring-red-500/20"
                        : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-1.5">
                        📌 {b.name}
                        {isSelected && <Check className="h-3.5 w-3.5 text-red-600 shrink-0" />}
                      </div>
                      <div className="text-[10px] text-zinc-400 font-mono truncate mt-0.5">
                        Board ID: {b.id}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-lg shrink-0 ${
                        isSelected
                          ? "bg-red-600 text-white"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                      }`}
                    >
                      {isSelected ? "Selected ✓" : "Select"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div>
            <label
              htmlFor="pinterest-board-id"
              className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block mb-1"
            >
              Selected Board ID (Numeric)
            </label>
            <input
              id="pinterest-board-id"
              type="text"
              placeholder="Auto-filled or enter e.g. 1029384756102"
              aria-label="Selected Board ID (Numeric)"
              value={pinterestBoardId}
              onChange={(e) => setPinterestBoardId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="pinterest-board-name"
              className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block mb-1"
            >
              Board Name (Display Label)
            </label>
            <input
              id="pinterest-board-name"
              type="text"
              placeholder="Auto-filled e.g. Store Catalog"
              aria-label="Board Name (Display Label)"
              value={pinterestBoardName}
              onChange={(e) => setPinterestBoardName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Step 3: Live Connected Status Banner */}
      {pinterestBoardId && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-red-50 to-amber-50 dark:from-red-950/40 dark:to-amber-950/30 border border-red-200/80 dark:border-red-900/60 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-600 text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
              📌
            </div>
            <div>
              <div className="text-xs font-bold text-red-950 dark:text-red-100 flex items-center gap-2">
                <span>
                  Connected Target Board: <strong>{pinterestBoardName || pinterestBoardId}</strong>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                  Ready to Sync
                </span>
              </div>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5">
                Products created with images will automatically publish as Product Pins and be
                indexed by Google Search.
              </p>
            </div>
          </div>
          <a
            href="https://www.pinterest.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-bold text-red-700 dark:text-red-300 hover:underline px-3 py-1.5 rounded-xl bg-white/90 dark:bg-zinc-900 border border-red-200 dark:border-red-800 shadow-2xs"
          >
            View Board on Pinterest <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}

      {/* Action Buttons */}
      <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={onSave}
            disabled={isPending}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-all disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save Pinterest Settings
          </button>
          <button
            type="button"
            onClick={onTestPinterest}
            disabled={isPending}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold border border-red-200 dark:border-red-800 hover:bg-blue-50 dark:hover:bg-red-950/30 text-red-700 dark:text-red-400 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Zap className="h-3.5 w-3.5" /> Test Connection
          </button>
        </div>
        {testResult && (
          <span
            className={`text-xs font-medium px-3 py-1.5 rounded-lg ${
              testResult.valid
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                : "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
            }`}
          >
            {testResult.message}
          </span>
        )}
      </div>
    </div>
  );
}
