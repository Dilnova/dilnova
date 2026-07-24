import { useState, useTransition, useMemo, useCallback } from "react";
import type { VendorBillingRegisterData } from "@/features/billing/types";
import { getVendorBillingRegisterData } from "@/features/billing/register.actions";
import { processBillingCheckoutAction } from "@/features/billing/checkout.actions";
import { resolveEffectiveStockAvailability } from "@/features/inventory/availability.shared";
import { toast } from "sonner";
import { playAudioFeedback } from "../utils/pos-audio";

export function usePOSBilling(initialData: VendorBillingRegisterData) {
  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState(initialData);

  // Search & Filtering State
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<
    "all" | "products" | "services" | "low_stock"
  >("all");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 24;

  // Cart State
  const [cart, setCart] = useState<
    { product: (typeof data.inventoryItems)[number]; quantity: number }[]
  >([]);
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "other">("cash");
  const [cashTendered, setCashTendered] = useState<string>("");
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [receiptToPrint, setReceiptToPrint] = useState<{
    id: string;
    branchName: string;
    date: string;
    items: { name: string; qty: number; price: number }[];
    discountPercent: number;
    [key: string]: any;
  } | null>(null);

  // Branch Selector
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");

  const availabilityCatalog = data.stockAvailabilityCatalog || [];

  const refreshData = async () => {
    try {
      const fresh = await getVendorBillingRegisterData();
      setData(fresh);
    } catch (_err) {
      toast.error("Failed to refresh data.");
    }
  };

  const isProductPurchasable = useCallback(
    (item: (typeof data.inventoryItems)[number]) => {
      if (item.productType === "service") return true;
      if (!item.id) return false;
      const availability = resolveEffectiveStockAvailability(
        availabilityCatalog,
        item.stockAvailability,
        item.quantity ?? 0,
      );
      return availability?.allowsPurchase ?? false;
    },
    [availabilityCatalog],
  );

  const getProductStockInfo = useCallback(
    (productId: string) => {
      const prod = data.inventoryItems.find((i) => i.productId === productId);
      if (prod?.productType === "service") {
        return { qty: 999999, sku: "Service", binLocation: "N/A" };
      }
      if (selectedBranchId) {
        const bInv = data.branchInventory.find(
          (bi) => bi.branchId === selectedBranchId && bi.productId === productId,
        );
        return {
          qty: bInv?.quantity ?? 0,
          sku: bInv?.sku || "—",
          binLocation: bInv?.binLocation || "—",
        };
      }
      const cInv = data.inventoryItems.find((i) => i.productId === productId);
      return {
        qty: cInv?.quantity ?? 0,
        sku: cInv?.sku || "—",
        binLocation: cInv?.binLocation || "—",
      };
    },
    [data.inventoryItems, data.branchInventory, selectedBranchId],
  );

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return data.inventoryItems.filter((item) => {
      if (!isProductPurchasable(item)) return false;

      if (categoryFilter === "products" && item.productType !== "product") return false;
      if (categoryFilter === "services" && item.productType !== "service") return false;

      const info = getProductStockInfo(item.productId);
      if (categoryFilter === "low_stock" && (item.productType === "service" || info.qty > 5))
        return false;

      const query = searchQuery.trim().toLowerCase();
      if (!query) return true;

      const matchesName = item.productName.toLowerCase().includes(query);
      const matchesSku = item.sku ? item.sku.toLowerCase().includes(query) : false;
      const matchesId = item.productId.toLowerCase() === query;

      return matchesName || matchesSku || matchesId;
    });
  }, [data.inventoryItems, searchQuery, categoryFilter, getProductStockInfo, isProductPurchasable]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  const addToCart = (product: (typeof data.inventoryItems)[number], playSound = true) => {
    if (!isProductPurchasable(product)) {
      toast.error("This item is not available for sale.");
      playAudioFeedback("error");
      return;
    }
    const stock = getProductStockInfo(product.productId);
    const existing = cart.find((item) => item.product.productId === product.productId);
    const currentQtyInCart = existing?.quantity ?? 0;

    if (stock.qty <= currentQtyInCart) {
      toast.error(`Insufficient stock! Only ${stock.qty} units available.`);
      playAudioFeedback("error");
      return;
    }

    if (existing) {
      setCart(
        cart.map((item) =>
          item.product.productId === product.productId
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        ),
      );
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }

    if (playSound) playAudioFeedback("scan");
  };

  const updateCartQty = (productId: string, qty: number) => {
    const stock = getProductStockInfo(productId);
    if (qty > stock.qty) {
      toast.error(`Only ${stock.qty} units available.`);
      playAudioFeedback("error");
      return;
    }
    if (qty <= 0) {
      setCart(cart.filter((item) => item.product.productId !== productId));
    } else {
      setCart(
        cart.map((item) =>
          item.product.productId === productId ? { ...item, quantity: qty } : item,
        ),
      );
    }
  };

  const removeCartItem = (productId: string) => {
    setCart(cart.filter((item) => item.product.productId !== productId));
  };

  const subtotalAmount = cart.reduce(
    (sum, item) => sum + item.quantity * ((item.product.productPrice ?? 0) / 100),
    0,
  );
  const discountAmount = (subtotalAmount * discountPercent) / 100;
  const totalAmount = Math.max(0, subtotalAmount - discountAmount);
  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const cashTenderedVal = parseFloat(cashTendered) || 0;
  const changeDue = Math.max(0, cashTenderedVal - totalAmount);

  const handlePOSCheckout = (onSuccess?: () => void) => {
    if (cart.length === 0) return;
    if (!selectedBranchId) {
      toast.error("Select a branch register first.");
      playAudioFeedback("error");
      return;
    }
    if (paymentMethod === "cash" && cashTenderedVal < totalAmount && cashTenderedVal > 0) {
      toast.error(
        `Cash tendered ($${cashTenderedVal.toFixed(2)}) is less than total ($${totalAmount.toFixed(2)}).`,
      );
      playAudioFeedback("error");
      return;
    }

    startTransition(async () => {
      try {
        const payload = cart.map((item) => {
          const effectivePriceCents = Math.round(
            ((item.product.productPrice ?? 0) * (100 - discountPercent)) / 100,
          );
          return {
            productId: item.product.productId,
            productName: item.product.productName,
            quantity: item.quantity,
            unitPrice: effectivePriceCents,
          };
        });

        const result = await processBillingCheckoutAction({
          branchId: selectedBranchId,
          items: payload,
          paymentMethod,
          customerName,
          notes,
        });

        if (!result?.data?.success) {
          playAudioFeedback("error");
          toast.error(result?.serverError || "POS checkout failed.");
          return;
        }

        playAudioFeedback("checkout");
        toast.success(
          `POS receipt processed! Total: $${(result.data.totalAmount / 100).toFixed(2)}`,
        );

        setReceiptToPrint({
          id: result.data.receiptId,
          branchName: data.branches.find((b) => b.id === selectedBranchId)?.name || "Main Register",
          items: cart.map((i) => ({
            name: i.product.productName,
            qty: i.quantity,
            price: ((i.product.productPrice ?? 0) * (100 - discountPercent)) / 10000,
          })),
          subtotal: subtotalAmount,
          discountPercent,
          discountAmount,
          total: result.data.totalAmount / 100,
          paymentMethod,
          cashTendered: paymentMethod === "cash" ? cashTenderedVal : null,
          changeDue: paymentMethod === "cash" ? changeDue : null,
          customerName,
          date: new Date().toISOString(),
        });

        setCart([]);
        setCustomerName("");
        setNotes("");
        setCashTendered("");
        setDiscountPercent(0);
        onSuccess?.();
        await refreshData();
      } catch (err) {
        playAudioFeedback("error");
        toast.error(err instanceof Error && err.message ? err.message : "POS checkout failed.");
      }
    });
  };

  return {
    isPending,
    data,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    currentPage,
    setCurrentPage,
    cart,
    setCart,
    customerName,
    setCustomerName,
    notes,
    setNotes,
    paymentMethod,
    setPaymentMethod,
    cashTendered,
    setCashTendered,
    discountPercent,
    setDiscountPercent,
    receiptToPrint,
    setReceiptToPrint,
    selectedBranchId,
    setSelectedBranchId,
    filteredProducts,
    paginatedProducts,
    totalPages,
    addToCart,
    updateCartQty,
    removeCartItem,
    subtotalAmount,
    discountAmount,
    totalAmount,
    totalItemCount,
    cashTenderedVal,
    changeDue,
    handlePOSCheckout,
    getProductStockInfo,
    isProductPurchasable,
  };
}
