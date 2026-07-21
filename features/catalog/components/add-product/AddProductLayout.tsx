'use client';

import React from 'react';
import { useAddProduct } from './AddProductContext';
import ProductBasicDetailsForm from './ProductBasicDetailsForm';
import ProductDescriptionForm from './ProductDescriptionForm';
import ProductMediaForm from './ProductMediaForm';
import ProductTipsSidebar from './ProductTipsSidebar';
import { Spinner } from '@/shared/ui/loading';

export default function AddProductLayout() {
  const { handleAddItem, isPending, isUploading } = useAddProduct();

  return (
    <div className="relative pb-24 sm:pb-6">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-8">
        <div className="lg:col-span-3">
          <form onSubmit={handleAddItem} className="space-y-5">
            <ProductBasicDetailsForm />
            <ProductDescriptionForm />
            <ProductMediaForm />

            <button
              type="submit"
              disabled={isPending || isUploading}
              className="hidden sm:flex w-full py-3.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 cursor-pointer shadow-md shadow-purple-900/15 items-center justify-center gap-2 active:scale-[0.98]"
            >
              {isPending ? (
                <>
                  <Spinner size="sm" />
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  Add Catalog Item
                </>
              )}
            </button>
          </form>
        </div>

        <ProductTipsSidebar />
      </div>

      <div className="fixed bottom-0 left-0 right-0 sm:hidden z-50 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-200 dark:border-zinc-800 px-4 py-3 safe-area-bottom">
        <button
          type="button"
          onClick={() => {
            const form = document.querySelector('form');
            if (form) {
              form.requestSubmit();
            }
          }}
          disabled={isPending || isUploading}
          className="w-full py-3.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2 active:scale-[0.97]"
        >
          {isPending ? (
            <>
              <Spinner size="sm" />
              Saving...
            </>
          ) : isUploading ? (
            <>
              <Spinner size="sm" />
              Uploading Media...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Add Catalog Item
            </>
          )}
        </button>
      </div>
    </div>
  );
}
