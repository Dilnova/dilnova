import React from 'react';
import type { CatalogVendorRef } from '@/features/catalog/types';

interface VendorFilterProps {
  vendors: CatalogVendorRef[];
  currentVendor?: string;
  updateParams: (updates: Record<string, string | null>) => void;
}

export default function VendorFilter({ vendors, currentVendor, updateParams }: VendorFilterProps) {
  const sortedVendors = [...vendors].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 font-mono">
        Vendor / Seller
      </label>
      <select
        value={currentVendor}
        onChange={(e) => updateParams({ vendor: e.target.value || null })}
        className="w-full text-xs px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer font-medium"
      >
        <option value="">All Vendors</option>
        {sortedVendors
          .filter((vendor) => vendor.slug)
          .map((vendor) => (
            <option key={vendor.id} value={vendor.slug!}>
              {vendor.name}
            </option>
          ))}
      </select>
    </div>
  );
}
