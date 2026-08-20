"use client";

import Image from "next/image";
import Link from "next/link";
import { isVideoUrl } from "@/shared/media/media";
import { useCurrency } from "@/shared/currency/context/currency-context";
import { DEFAULT_CURRENCY } from "@/shared/currency";
import { toast } from "sonner";

export interface CartItemType {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string | null;
  imageUrls?: string[];
  stockQuantity?: number;
  stockStatus?: string;
  orgId?: string;
  type?: string;
  vendorName?: string;
  [key: string]: unknown;
}

export interface VendorCartGroup {
  orgId: string;
  orgName?: string;
  vendorName?: string;
  orgSlug?: string;
  items: CartItemType[];
  [key: string]: unknown;
}

interface CartVendorGroupsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vendorCartGroups: any[];
  showVendorCheckoutSelection: boolean;
  showProductCheckoutSelection: boolean;
  selectedCheckoutVendorOrgId: string;
  selectedCheckoutProductIdSet: Set<string>;
  productTaxMap?: Record<
    string,
    { code: string; name: string; ratePercent: number; taxAmountCents?: number }
  >;
  stockValidationMap?: Record<
    string,
    {
      productId: string;
      requestedQuantity: number;
      availableStock: number;
      isStockValid: boolean;
      errorMessage: string | null;
    }
  >;
  onSelectCheckoutVendor: (orgId: string, productIds: string[]) => void;
  onToggleProductCheckout: (productId: string) => void;
  onToggleAllProductsInGroup: (productIds: string[], checked: boolean) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeFromCart: (id: string) => void;
}

export function CartVendorGroups({
  vendorCartGroups,
  showVendorCheckoutSelection,
  showProductCheckoutSelection,
  selectedCheckoutVendorOrgId,
  selectedCheckoutProductIdSet,
  productTaxMap = {},
  stockValidationMap = {},
  onSelectCheckoutVendor,
  onToggleProductCheckout,
  onToggleAllProductsInGroup,
  updateQuantity,
  removeFromCart,
}: CartVendorGroupsProps) {
  const { format } = useCurrency();
  const formatPrice = (cents: number, currency?: string) => {
    return format(cents, currency || DEFAULT_CURRENCY);
  };

  return (
    <div className="space-y-4">
      {showVendorCheckoutSelection && (
        <p className="text-[11px] text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-900 rounded-xl px-4 py-3">
          Select a vendor, tick the products you want, then checkout. Unticked items stay in your
          cart.
        </p>
      )}
      {showProductCheckoutSelection && !showVendorCheckoutSelection && (
        <p className="text-[11px] text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-900 rounded-xl px-4 py-3">
          Tick the products you want to checkout. Unticked items stay in your cart.
        </p>
      )}

      <div className="space-y-4">
        {vendorCartGroups.map((group) => {
          const isSelectedForCheckout =
            !showVendorCheckoutSelection || selectedCheckoutVendorOrgId === group.orgId;
          const groupProductIds = group.items.map((item: CartItemType) => item.id);
          const allGroupProductsSelected =
            group.items.length > 0 &&
            group.items.every((item: CartItemType) => selectedCheckoutProductIdSet.has(item.id));
          const showProductTicks =
            showProductCheckoutSelection && (isSelectedForCheckout || !showVendorCheckoutSelection);

          return (
            <section
              key={group.orgId}
              className={`rounded-2xl border transition-colors ${
                isSelectedForCheckout
                  ? "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
                  : "bg-zinc-50/50 dark:bg-zinc-950/40 border-zinc-200/60 dark:border-zinc-900"
              } p-4 sm:p-6`}
            >
              {/* Vendor Header bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-zinc-100 dark:border-zinc-900">
                <div className="flex items-center gap-3">
                  {showVendorCheckoutSelection && (
                    <input
                      type="radio"
                      name="vendor-checkout-selection"
                      checked={selectedCheckoutVendorOrgId === group.orgId}
                      onChange={() => onSelectCheckoutVendor(group.orgId, groupProductIds)}
                      className="accent-emerald-600 h-4 w-4"
                    />
                  )}
                  <div>
                    <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      {group.orgName || group.vendorName || "Store"}
                      {group.orgSlug && (
                        <Link
                          href={`/vendors/${group.orgSlug}`}
                          className="text-[11px] font-normal text-emerald-600 dark:text-emerald-400 hover:underline"
                        >
                          Visit store →
                        </Link>
                      )}
                    </h2>
                    <p className="text-[11px] text-zinc-500">
                      {group.items.length} {group.items.length === 1 ? "item" : "items"} in group
                    </p>
                  </div>
                </div>

                {showProductTicks && group.items.length > 1 && (
                  <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allGroupProductsSelected}
                      onChange={(e) =>
                        onToggleAllProductsInGroup(groupProductIds, e.target.checked)
                      }
                      className="rounded border-zinc-300 dark:border-zinc-700"
                    />
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                      All
                    </span>
                  </label>
                )}
              </div>

              <div className="divide-y divide-zinc-100 dark:divide-zinc-900 space-y-6">
                {group.items.map((item: CartItemType) => {
                  const isProductSelected = selectedCheckoutProductIdSet.has(item.id);

                  return (
                    <div
                      key={item.id}
                      className={`flex flex-col md:flex-row md:items-center justify-between gap-6 py-6 first:pt-0 last:pb-0 ${
                        showProductTicks && !isProductSelected ? "opacity-50" : ""
                      }`}
                    >
                      <div className="flex gap-4 items-center flex-1 min-w-0">
                        {showProductTicks && (
                          <input
                            type="checkbox"
                            checked={isProductSelected}
                            onChange={() => onToggleProductCheckout(item.id)}
                            className="mt-1 shrink-0 rounded border-zinc-300 dark:border-zinc-700"
                            aria-label={`Include ${item.name} in checkout`}
                          />
                        )}
                        <div className="w-20 h-20 relative flex-shrink-0 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-900 rounded-2xl overflow-hidden shadow-sm">
                          {item.imageUrl ? (
                            isVideoUrl(item.imageUrl) ? (
                              <video
                                src={item.imageUrl}
                                muted
                                loop
                                playsInline
                                autoPlay
                                className="object-cover w-full h-full"
                              />
                            ) : (
                              <Image
                                src={item.imageUrl}
                                alt={item.name}
                                fill
                                className="object-cover"
                                sizes="80px"
                              />
                            )
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xl bg-zinc-100 dark:bg-zinc-900">
                              📦
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                            <span
                              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider ${
                                item.type === "service"
                                  ? "bg-teal-500/10 text-teal-650 dark:text-teal-400"
                                  : "bg-indigo-500/10 text-indigo-650 dark:text-indigo-400"
                              }`}
                            >
                              {item.type || "product"}
                            </span>

                            {item.type !== "service" && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                                ⚖️{" "}
                                {typeof item.weightGrams === "number" && item.weightGrams > 0
                                  ? item.weightGrams >= 1000
                                    ? `${(item.weightGrams / 1000).toFixed(2)} kg (${item.weightGrams}g)`
                                    : `${item.weightGrams}g`
                                  : "100g (est)"}
                              </span>
                            )}

                            {productTaxMap?.[item.id] && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                                🏷️ Tax: {productTaxMap[item.id].name} (
                                {productTaxMap[item.id].ratePercent}%)
                              </span>
                            )}
                          </div>

                          <Link
                            href={`/products/${item.id}`}
                            className="block text-sm font-extrabold text-zinc-900 dark:text-zinc-50 hover:text-purple-650 dark:hover:text-purple-400 transition-colors line-clamp-1"
                          >
                            {item.name}
                          </Link>
                          {(() => {
                            const val = stockValidationMap[item.id];
                            const isInvalid = val
                              ? !val.isStockValid
                              : typeof item.stockQuantity === "number" &&
                                item.quantity > item.stockQuantity;
                            const avail = val ? val.availableStock : (item.stockQuantity ?? 0);
                            const errMsg =
                              val?.errorMessage || "Requested quantity exceeds available stock.";
                            if (!isInvalid) return null;

                            return (
                              <div className="mt-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex flex-wrap items-center justify-between gap-2">
                                <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-300">
                                  ⚠️ {errMsg}
                                </span>
                                {avail > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => updateQuantity(item.id, avail)}
                                    className="px-2.5 py-1 text-[10px] font-bold font-mono uppercase rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-all cursor-pointer shadow-xs"
                                  >
                                    Adjust to {avail} {avail === 1 ? "unit" : "units"}
                                  </button>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-6 md:gap-10">
                        <div className="flex items-center border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-zinc-50/50 dark:bg-zinc-900/30">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-855 dark:text-zinc-400 dark:hover:text-zinc-150 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-bold transition-all cursor-pointer"
                            aria-label="Decrease quantity"
                          >
                            -
                          </button>
                          <span className="px-2 text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200 select-none">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => {
                              if (
                                typeof item.stockQuantity === "number" &&
                                item.stockQuantity > 0 &&
                                item.quantity >= item.stockQuantity
                              ) {
                                toast.warning(`Maximum order quantity reached for "${item.name}".`);
                                return;
                              }
                              updateQuantity(item.id, item.quantity + 1);
                            }}
                            className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-855 dark:text-zinc-400 dark:hover:text-zinc-150 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-bold transition-all cursor-pointer"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>

                        <div className="text-right flex flex-col justify-center min-w-[100px]">
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono block">
                            {formatPrice(item.price, (item.currency as string) || DEFAULT_CURRENCY)}{" "}
                            each
                          </span>
                          <span className="text-sm font-extrabold font-mono text-zinc-955 dark:text-zinc-50 mt-0.5">
                            {formatPrice(
                              item.price * item.quantity,
                              (item.currency as string) || DEFAULT_CURRENCY,
                            )}
                          </span>
                          {productTaxMap?.[item.id] && (
                            <span className="text-[11px] font-semibold font-mono text-purple-700 dark:text-purple-300 mt-1 block whitespace-nowrap">
                              Tax:{" "}
                              {formatPrice(
                                productTaxMap[item.id].taxAmountCents ?? 0,
                                (item.currency as string) || DEFAULT_CURRENCY,
                              )}
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-zinc-400 hover:text-red-500 p-2 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-xl transition-all cursor-pointer"
                          title="Remove item"
                          aria-label="Remove item"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
