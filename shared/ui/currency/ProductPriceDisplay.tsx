"use client";

import { useCurrency } from "@/shared/currency/context/currency-context";
import { formatMoney, DEFAULT_CURRENCY } from "@/shared/currency";

interface ProductPriceDisplayProps {
  priceInSubunits: number;
  baseCurrency?: string;
  className?: string;
}

export default function ProductPriceDisplay({
  priceInSubunits,
  baseCurrency = DEFAULT_CURRENCY,
  className = "",
}: ProductPriceDisplayProps) {
  const { format, isLoading } = useCurrency();

  if (isLoading) {
    return <span className={className}>{formatMoney(priceInSubunits, baseCurrency)}</span>;
  }

  return <span className={className}>{format(priceInSubunits, baseCurrency)}</span>;
}
