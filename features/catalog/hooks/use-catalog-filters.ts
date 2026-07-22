import { useState, useTransition, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function useCatalogFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentSearch = searchParams.get("search") || "";
  const currentMinPrice = searchParams.get("minPrice") || "";
  const currentMaxPrice = searchParams.get("maxPrice") || "";

  const [searchVal, setSearchVal] = useState(currentSearch);
  const [minPriceVal, setMinPriceVal] = useState(currentMinPrice);
  const [maxPriceVal, setMaxPriceVal] = useState(currentMaxPrice);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Sync state when URL params change
  useEffect(() => {
    setSearchVal(currentSearch);
    setMinPriceVal(currentMinPrice);
    setMaxPriceVal(currentMaxPrice);
  }, [currentSearch, currentMinPrice, currentMaxPrice]);

  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    // Always reset to page 1 when filters change (if pagination existed, we'd do it here)
    // params.delete('page');

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ search: searchVal || null });
  };

  const handleClearSearch = () => {
    setSearchVal("");
    updateParams({ search: null });
  };

  const handlePriceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({
      minPrice: minPriceVal || null,
      maxPrice: maxPriceVal || null,
    });
  };

  const handleApplyPresetPrice = (min: string, max: string) => {
    setMinPriceVal(min);
    setMaxPriceVal(max);
    updateParams({ minPrice: min || null, maxPrice: max || null });
  };

  const handleRemoveSingleFilter = (key: string) => {
    if (key === "search") {
      setSearchVal("");
      updateParams({ search: null });
    } else if (key === "category") {
      updateParams({ category: null });
    } else if (key === "type") {
      updateParams({ type: null });
    } else if (key === "vendor") {
      updateParams({ vendor: null });
    } else if (key === "price") {
      setMinPriceVal("");
      setMaxPriceVal("");
      updateParams({ minPrice: null, maxPrice: null });
    } else if (key === "stock") {
      updateParams({ stock: null });
    }
  };

  const clearAllFilters = () => {
    setSearchVal("");
    setMinPriceVal("");
    setMaxPriceVal("");
    startTransition(() => {
      router.push(pathname);
    });
    setIsMobileDrawerOpen(false);
  };

  return {
    isPending,
    searchVal,
    setSearchVal,
    minPriceVal,
    setMinPriceVal,
    maxPriceVal,
    setMaxPriceVal,
    isMobileDrawerOpen,
    setIsMobileDrawerOpen,
    updateParams,
    handleSearchSubmit,
    handleClearSearch,
    handlePriceSubmit,
    handleApplyPresetPrice,
    handleRemoveSingleFilter,
    clearAllFilters,
  };
}
