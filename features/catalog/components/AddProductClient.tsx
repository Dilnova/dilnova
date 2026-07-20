'use client';

import React from 'react';
import type { StockAvailabilityDefinition } from '@/features/inventory/availability.shared';
import { AddProductProvider } from './add-product/AddProductContext';
import AddProductLayout from './add-product/AddProductLayout';

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
}

interface AddProductClientProps {
  categories: Category[];
  maxMediaLimit: number;
  branches?: { id: string; name: string; isDefault: boolean }[];
  isMultiBranchActive?: boolean;
  stockAllocationMode?: 'target_branch' | 'central_intake';
  stockAvailabilityOptions?: StockAvailabilityDefinition[];
}

export default function AddProductClient({
  categories,
  maxMediaLimit,
  branches = [],
  isMultiBranchActive = false,
  stockAllocationMode = 'central_intake',
  stockAvailabilityOptions = [],
}: AddProductClientProps) {
  return (
    <AddProductProvider
      categories={categories}
      maxMediaLimit={maxMediaLimit}
      branches={branches}
      isMultiBranchActive={isMultiBranchActive}
      stockAllocationMode={stockAllocationMode}
      stockAvailabilityOptions={stockAvailabilityOptions}
    >
      <AddProductLayout />
    </AddProductProvider>
  );
}
