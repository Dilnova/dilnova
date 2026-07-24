"use client";

import Image from "next/image";
import Link from "next/link";
import { isVideoUrl } from "@/shared/media/media";

export interface CartItemType {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string | null;
  imageUrls?: string[];
  stockQuantity?: number;
  stockStatus?: string;
  orgId: string;
  [key: string]: any;
}

export interface VendorCartGroup {
  orgId: string;
  orgName?: string;
  vendorName?: string;
  orgSlug?: string;
  items: CartItemType[];
  [key: string]: any;
}

interface CartVendorGroupsProps {
  vendorCartGroups: any[];
  showVendorCheckoutSelection: boolean;
  showProductCheckoutSelection: boolean;
  selectedCheckoutVendorOrgId: string;
  selectedCheckoutProductIdSet: Set<string>;
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
  onSelectCheckoutVendor,
  onToggleProductCheckout,
  onToggleAllProductsInGroup,
  updateQuantity,
  removeFromCart,
}: CartVendorGroupsProps) {
  const formatPrice = (cents: number) => {
    return (cents / 100).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });
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
          const groupProductIds = group.items.map((item: any) => item.id);
          const groupSelectedCount = group.items.filter((item: any) =>
            selectedCheckoutProductIdSet.has(item.id),
          ).length;
          const allGroupProductsSelected =
            group.items.length > 0 &&
            group.items.every((item: any) => selectedCheckoutProductIdSet.has(item.id));
          const showProductTicks =
            showProductCheckoutSelection && (isSelectedForCheckout || !showVendorCheckoutSelection);

          return (
            <section
              key={group.orgId}
              className={`bg-white border rounded-2xl p-6 dark:bg-zinc-950 shadow-sm transition-all ${
                showVendorCheckoutSelection
                  ? isSelectedForCheckout
                    ? "border-purple-500/50 bg-purple-500/[0.03] ring-1 ring-purple-500/20"
                    : "border-zinc-200/80 dark:border-zinc-900 opacity-75"
                  : "border-zinc-200/80 dark:border-zinc-900"
              }`}
            >
              <div className="flex items-start justify-between gap-4 pb-5 mb-5 border-b border-zinc-100 dark:border-zinc-900">
                {showVendorCheckoutSelection ? (
                  <label className="flex items-start gap-3 cursor-pointer flex-1 min-w-0">
                    <input
                      type="radio"
                      name="checkout-vendor"
                      value={group.orgId}
                      checked={selectedCheckoutVendorOrgId === group.orgId}
                      onChange={() => onSelectCheckoutVendor(group.orgId, groupProductIds)}
                      className="mt-1"
                    />
                    <span className="min-w-0">
                      <span className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                        Checkout vendor
                      </span>
                      <span className="block text-sm font-extrabold text-zinc-900 dark:text-zinc-50">
                        {group.vendorName}
                      </span>
                      <span className="block text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                        {group.itemCount} {group.itemCount === 1 ? "item" : "items"} ·{" "}
                        {formatPrice(group.subtotalCents)}
                      </span>
                      {isSelectedForCheckout && (
                        <span className="inline-flex mt-2 text-[10px] font-mono font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full">
                          Selected for checkout
                        </span>
                      )}
                    </span>
                  </label>
                ) : (
                  <div className="min-w-0 flex-1">
                    <span className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                      Vendor
                    </span>
                    <h2 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50">
                      {group.vendorName}
                    </h2>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                      {group.itemCount} {group.itemCount === 1 ? "item" : "items"} ·{" "}
                      {formatPrice(group.subtotalCents)}
                    </p>
                  </div>
                )}
                {showProductTicks && (
                  <label className="flex items-center gap-2 shrink-0 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allGroupProductsSelected}
                      ref={(el) => {
                        if (el) {
                          el.indeterminate = groupSelectedCount > 0 && !allGroupProductsSelected;
                        }
                      }}
                      onChange={() =>
                        onToggleAllProductsInGroup(groupProductIds, !allGroupProductsSelected)
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
                {group.items.map((item: any) => {
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
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider mb-1.5 ${
                              item.type === "service"
                                ? "bg-teal-500/10 text-teal-650 dark:text-teal-400"
                                : "bg-indigo-500/10 text-indigo-650 dark:text-indigo-400"
                            }`}
                          >
                            {item.type}
                          </span>

                          <Link
                            href={`/products/${item.id}`}
                            className="block text-sm font-extrabold text-zinc-900 dark:text-zinc-50 hover:text-purple-650 dark:hover:text-purple-400 transition-colors line-clamp-1"
                          >
                            {item.name}
                          </Link>
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
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-855 dark:text-zinc-400 dark:hover:text-zinc-150 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-bold transition-all cursor-pointer"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>

                        <div className="text-right flex flex-col justify-center min-w-[90px]">
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono block">
                            {formatPrice(item.price)} each
                          </span>
                          <span className="text-sm font-extrabold font-mono text-zinc-955 dark:text-zinc-50 mt-0.5">
                            {formatPrice(item.price * item.quantity)}
                          </span>
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
