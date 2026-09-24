"use client";

import { Clock, RefreshCw } from "lucide-react";
import type { SyncLogItem } from "./types";

interface ActivityLogsTableProps {
  logs: SyncLogItem[];
  logsLoading: boolean;
  lastSyncAt: Date | null;
  onRefresh: () => void;
}

export function ActivityLogsTable({
  logs,
  logsLoading,
  lastSyncAt,
  onRefresh,
}: ActivityLogsTableProps) {
  return (
    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-zinc-400" />
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            Recent Multi-Channel Activity
          </h2>
          {lastSyncAt && (
            <span className="text-[10px] text-zinc-400">
              (Last event: {lastSyncAt.toLocaleTimeString()})
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={logsLoading}
          className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-700 dark:text-purple-400 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${logsLoading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-8 text-zinc-400 text-xs font-mono">
          No synchronization activity recorded yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800 text-[10px] font-bold uppercase text-zinc-400 tracking-wider">
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Channel / Action</th>
                <th className="py-2.5 px-3">Product Name</th>
                <th className="py-2.5 px-3">Details / Handle</th>
                <th className="py-2.5 px-3">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/40">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        log.status === "SUCCESS"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400"
                          : log.status === "SKIPPED"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400"
                            : log.status === "PENDING"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400"
                      }`}
                    >
                      {log.status === "SUCCESS"
                        ? "✓ Success"
                        : log.status === "SKIPPED"
                          ? "⏭️ Skipped"
                          : log.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono font-semibold text-zinc-700 dark:text-zinc-300">
                    {log.action}
                  </td>
                  <td className="py-2.5 px-3 text-zinc-900 dark:text-zinc-100 font-medium">
                    {log.productName || "—"}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-zinc-500">
                    {log.errorMessage ? (
                      <span className="text-rose-500">{log.errorMessage}</span>
                    ) : log.metaBatchHandle ? (
                      <span className="truncate block max-w-[200px]">{log.metaBatchHandle}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-zinc-400 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
