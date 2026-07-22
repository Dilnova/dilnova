"use client";

import { useState } from "react";

interface VendorMovementLogsTabProps {
  data: any; // Will be properly typed during TS cleanup
}

export default function VendorMovementLogsTab({ data }: VendorMovementLogsTabProps) {
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>("all");

  const filteredMovements = data.movements.filter(
    (m: any) => movementTypeFilter === "all" || m.type === movementTypeFilter,
  );

  const movementTypeLabels: Record<string, string> = {
    restock: "📥 Restock",
    sale_depletion: "📤 Sale",
    manual_adjustment: "🔧 Adjustment",
    damage_loss: "⚠️ Damage/Loss",
    order_cancellation: "↩️ Cancellation",
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-50">
          Inventory Audit History
        </h3>
        <select
          value={movementTypeFilter}
          onChange={(e) => setMovementTypeFilter(e.target.value)}
          className="text-xs px-2 py-1 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900"
        >
          <option value="all">All Movements</option>
          <option value="restock">Restock</option>
          <option value="sale_depletion">Sale</option>
          <option value="manual_adjustment">Manual Adjustment</option>
          <option value="damage_loss">Damage/Loss</option>
          <option value="order_cancellation">Cancellation</option>
        </select>
      </div>
      <div className="bg-white border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 overflow-hidden shadow-sm rounded-2xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 uppercase font-mono text-[9px]">
              <th className="p-3">Date</th>
              <th className="p-3">Product</th>
              <th className="p-3">Type</th>
              <th className="p-3">Adjusted</th>
              <th className="p-3">Before → After</th>
              <th className="p-3">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
            {filteredMovements.map((m: any) => (
              <tr key={m.id} className="hover:bg-zinc-50/20">
                <td className="p-3 text-zinc-500 font-mono">
                  {new Date(m.createdAt).toLocaleDateString()}
                </td>
                <td className="p-3 font-bold text-zinc-900 dark:text-zinc-200">{m.productName}</td>
                <td className="p-3 font-semibold text-zinc-900 dark:text-zinc-200">
                  {movementTypeLabels[m.type] || m.type}
                </td>
                <td className="p-3 font-bold font-mono">
                  <span className={m.quantityChanged > 0 ? "text-emerald-600" : "text-rose-600"}>
                    {m.quantityChanged > 0 ? "+" : ""}
                    {m.quantityChanged}
                  </span>
                </td>
                <td className="p-3 text-zinc-500 font-mono">
                  {m.previousQuantity} → {m.newQuantity}
                </td>
                <td className="p-3 text-zinc-500 max-w-[200px] truncate">{m.reason || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
