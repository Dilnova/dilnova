import React from 'react';
import CategoryFilter from './CategoryFilter';
import ListingTypeFilter from './ListingTypeFilter';
import PriceFilter from './PriceFilter';
import AvailabilityFilter from './AvailabilityFilter';
import VendorFilter from './VendorFilter';
import type {
  CatalogCategoryRef,
  CatalogVendorRef,
  CatalogStockFilter,
} from '@/features/catalog/types';

export interface SharedFilterSectionProps {
  categories: CatalogCategoryRef[];
  vendors: CatalogVendorRef[];
  currentCategory?: string;
  currentType?: string;
  currentVendor?: string;
  currentMinPrice?: string;
  currentMaxPrice?: string;
  currentStock?: CatalogStockFilter;
  isPending: boolean;
  minPriceVal: string;
  maxPriceVal: string;
  setMinPriceVal: (v: string) => void;
  setMaxPriceVal: (v: string) => void;
  updateParams: (updates: Record<string, string | null>) => void;
  handlePriceSubmit: (e: React.FormEvent) => void;
  handleApplyPresetPrice: (min: string, max: string) => void;
}

export default function FilterAccordionGroup({
  categories,
  vendors,
  currentCategory,
  currentType,
  currentVendor,
  currentMinPrice,
  currentMaxPrice,
  currentStock,
  isPending,
  minPriceVal,
  maxPriceVal,
  setMinPriceVal,
  setMaxPriceVal,
  updateParams,
  handlePriceSubmit,
  handleApplyPresetPrice,
}: SharedFilterSectionProps) {
  return (
    <div className="space-y-6">
      <CategoryFilter
        categories={categories}
        currentCategory={currentCategory}
        updateParams={updateParams}
      />
      <hr className="border-zinc-100 dark:border-zinc-900" />

      <ListingTypeFilter currentType={currentType} updateParams={updateParams} />
      <hr className="border-zinc-100 dark:border-zinc-900" />

      <PriceFilter
        currentMinPrice={currentMinPrice}
        currentMaxPrice={currentMaxPrice}
        minPriceVal={minPriceVal}
        maxPriceVal={maxPriceVal}
        setMinPriceVal={setMinPriceVal}
        setMaxPriceVal={setMaxPriceVal}
        updateParams={updateParams}
        handlePriceSubmit={handlePriceSubmit}
        handleApplyPresetPrice={handleApplyPresetPrice}
        isPending={isPending}
      />
      <hr className="border-zinc-100 dark:border-zinc-900" />

      <AvailabilityFilter
        currentStock={currentStock}
        updateParams={updateParams}
      />
      <hr className="border-zinc-100 dark:border-zinc-900" />

      <VendorFilter
        vendors={vendors}
        currentVendor={currentVendor}
        updateParams={updateParams}
      />
    </div>
  );
}
