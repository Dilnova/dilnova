'use client';

import { useState } from 'react';
import { InventoryMovement } from '../inventory.types';

interface SuperadminAuditTabProps {
  movements: InventoryMovement[];
}

export default function SuperadminAuditTab({ movements }: SuperadminAuditTabProps) {
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>('all');

  const movementTypeLabels: Record<string, string> = {
    restock: '📥 Restock',
    sale_depletion: '📤 Sale',
    manual_adjustment: '🔧 Adjustment',
    damage_loss: '⚠️ Damage/Loss',
    order_cancellation: '↩️ Cancellation',
  };

  const filteredMovements = movements.filter((m) =>
    movementTypeFilter === 'all' || m.type === movementTypeFilter
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-zinc-50">Inventory Movement Log</h2>
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl overflow-x-auto scrollbar-hide">
          {['all', 'restock', 'sale_depletion', 'manual_adjustment', 'damage_loss', 'order_cancellation'].map((f) => (
            <button
              key={f}
              onClick={() => setMovementTypeFilter(f)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                movementTypeFilter === f
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400'
              }`}
            >
              {f === 'all' ? 'All' : movementTypeLabels[f] || f}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl dark:bg-zinc-950 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 uppercase font-mono text-[10px] tracking-wider">
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Product</th>
                <th className="py-2.5 px-4">Type</th>
                <th className="py-2.5 px-4">Change</th>
                <th className="py-2.5 px-4">Before → After</th>
                <th className="py-2.5 px-4">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
              {filteredMovements.map((m) => (
                <tr key={m.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                  <td className="py-3 px-4 font-mono text-zinc-500 text-[11px]">
                    {new Date(m.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                  <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-zinc-200">{m.productName || '—'}</td>
                  <td className="py-3 px-4">
                    <span className="text-[11px]">{movementTypeLabels[m.type] || m.type}</span>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold">
                    <span className={m.quantityChanged > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                      {m.quantityChanged > 0 ? '+' : ''}{m.quantityChanged}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-zinc-500">{m.previousQuantity} → {m.newQuantity}</td>
                  <td className="py-3 px-4 text-zinc-500 max-w-[200px] truncate">{m.reason || '—'}</td>
                </tr>
              ))}
              {filteredMovements.length === 0 && (
                <tr><td colSpan={6} className="py-12 text-center text-zinc-400 font-mono text-sm">No movements recorded.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
