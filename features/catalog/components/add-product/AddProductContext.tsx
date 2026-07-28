"use client";

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useTransition,
  useEffect,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addProductAction } from "@/features/catalog/vendor.actions";
import { uploadToCloudinary } from "@/shared/media/cloudinary-upload";
<<<<<<< HEAD
import * as Sentry from "@sentry/nextjs";
=======
import { logger } from "@/shared/logging/logger";
>>>>>>> 03275f0c05322a4383da3e33eb513d23e005b7e6
import type { StockAvailabilityDefinition } from "@/features/inventory/availability.shared";

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
}

interface Branch {
  id: string;
  name: string;
  isDefault: boolean;
}

interface MediaItem {
  url: string;
  type: "image" | "video";
}

interface AddProductContextType {
  // Config
  categories: Category[];
  maxMediaLimit: number;
  branches: Branch[];
  isMultiBranchActive: boolean;
  stockAllocationMode: "target_branch" | "central_intake";
  stockAvailabilityOptions: StockAvailabilityDefinition[];

  // Form State
  name: string;
  setName: (v: string) => void;
  type: "product" | "service";
  setType: (v: "product" | "service") => void;
  description: string;
  setDescription: (v: string) => void;
  price: string;
  setPrice: (v: string) => void;
  categoryId: string;
  setCategoryId: (v: string) => void;
  quantity: string;
  setQuantity: (v: string) => void;
  stockAvailability: string;
  setStockAvailability: (v: string) => void;
  preorderType: "full_upfront" | "deposit" | "pay_later";
  setPreorderType: (v: "full_upfront" | "deposit" | "pay_later") => void;
  preorderDepositAmount: string;
  setPreorderDepositAmount: (v: string) => void;
  preorderMaxQuantity: string;
  setPreorderMaxQuantity: (v: string) => void;
  selectedBranchId: string;
  setSelectedBranchId: (v: string) => void;

  // Media State
  media: MediaItem[];
  uploadProgress: number | null;
  isUploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  cameraInputRef: React.RefObject<HTMLInputElement | null>;
  videoCameraInputRef: React.RefObject<HTMLInputElement | null>;

  // Handlers
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleRemoveMedia: (index: number) => void;
  handleAddItem: (e: React.FormEvent) => void;

  // Other state
  isPending: boolean;
}

const AddProductContext = createContext<AddProductContextType | null>(null);

export function useAddProduct() {
  const ctx = useContext(AddProductContext);
  if (!ctx) throw new Error("useAddProduct must be used within an AddProductProvider");
  return ctx;
}

export function AddProductProvider({
  children,
  categories,
  maxMediaLimit,
  branches = [],
  isMultiBranchActive = false,
  stockAllocationMode = "central_intake",
  stockAvailabilityOptions = [],
}: {
  children: React.ReactNode;
  categories: Category[];
  maxMediaLimit: number;
  branches?: Branch[];
  isMultiBranchActive?: boolean;
  stockAllocationMode?: "target_branch" | "central_intake";
  stockAvailabilityOptions?: StockAvailabilityDefinition[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState<"product" | "service">("product");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [stockAvailability, setStockAvailability] = useState(
    stockAvailabilityOptions.find((o) => o.id === "in_stock")?.id ||
      stockAvailabilityOptions[0]?.id ||
      "in_stock",
  );
  const [preorderType, setPreorderType] = useState<"full_upfront" | "deposit" | "pay_later">(
    "full_upfront",
  );
  const [preorderDepositAmount, setPreorderDepositAmount] = useState("");
  const [preorderMaxQuantity, setPreorderMaxQuantity] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState("");

  // Reset price & quantity when a locking status is selected
  useEffect(() => {
    if (stockAvailability === "coming_soon") {
      setPrice("");
      setQuantity("0");
    } else if (stockAvailability === "out_of_stock" || stockAvailability === "pre_order") {
      setQuantity("0");
    }
  }, [stockAvailability]);

  // Default to main/default branch
  useEffect(() => {
    if (branches && branches.length > 0) {
      const def = branches.find((b) => b.isDefault) || branches[0];
      setSelectedBranchId(def.id);
    }
  }, [branches]);

  const [media, setMedia] = useState<MediaItem[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoCameraInputRef = useRef<HTMLInputElement>(null);

  const [isPending, startTransition] = useTransition();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file) continue;

      if (media.length + i >= maxMediaLimit) {
        toast.error(`Maximum media upload limit of ${maxMediaLimit} reached.`);
        break;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error(`"${file.name}" exceeds 10MB limit.`);
        continue;
      }

      setIsUploading(true);
      setUploadProgress(0);

      const fileType = file.type.startsWith("video/") ? ("video" as const) : ("image" as const);

      try {
        const result = await uploadToCloudinary(file, (progress) => {
          setUploadProgress(progress.percent);
        });

        if (result.success && result.publicUrl) {
          const newItem = { url: result.publicUrl, type: fileType };
          setMedia((prev) => [...prev, newItem]);
          toast.success(`${fileType === "video" ? "Video" : "Image"} uploaded!`);
        } else {
          toast.error(result.error || "Upload failed");
        }
      } catch (err) {
<<<<<<< HEAD
        Sentry.captureException(err);
=======
        logger.error("Media upload error in AddProductContext", err);
>>>>>>> 03275f0c05322a4383da3e33eb513d23e005b7e6
        toast.error("Upload error. Please try again.");
      } finally {
        setIsUploading(false);
        setUploadProgress(null);
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (videoCameraInputRef.current) videoCameraInputRef.current.value = "";
  };

  const handleRemoveMedia = (index: number) => {
    setMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Item name is required.");
      return;
    }

    const isComingSoon = stockAvailability === "coming_soon";
    const isPreorder = stockAvailability === "pre_order";

    // ── Price Validation ─────────────────────────────────────────────────────
    let priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      if (isComingSoon) {
        priceNum = 0;
      } else {
        toast.error("Please enter a valid positive price.");
        return;
      }
    } else if (priceNum === 0 && !isComingSoon) {
      toast.error("Please enter a valid positive price.");
      return;
    }

    // ── Quantity Validation ──────────────────────────────────────────────────
    let quantityNum = 0;
    if (type === "product") {
      quantityNum = parseInt(quantity, 10);
      if (isNaN(quantityNum) || quantityNum < 0) {
        toast.error("Please enter a valid non-negative quantity.");
        return;
      }
    }

    // ── Pre-Order Specific Validation ────────────────────────────────────────
    let resolvedDepositAmount: number | null = null;
    let resolvedMaxQuantity: number | null = null;

    if (isPreorder) {
      // S4: Price must be set for any pre-order
      if (priceNum <= 0) {
        toast.error("Please enter a product price before configuring pre-order settings.");
        return;
      }

      // S6: Pre-order max quantity must be positive if provided
      if (preorderMaxQuantity !== "") {
        const maxQty = parseInt(preorderMaxQuantity, 10);
        if (isNaN(maxQty) || maxQty <= 0) {
          toast.error("Pre-order limit must be at least 1 unit.");
          return;
        }
        resolvedMaxQuantity = maxQty;
      }

      // Deposit model validations
      if (preorderType === "deposit") {
        const depositNum = parseFloat(preorderDepositAmount);

        // S3: Deposit must be greater than $0
        if (isNaN(depositNum) || depositNum <= 0) {
          toast.error("Deposit amount must be greater than $0.");
          return;
        }

        // S1: Deposit cannot exceed total price
        if (depositNum > priceNum) {
          toast.error(
            `Deposit amount (${depositNum.toFixed(2)}) cannot exceed the total product price (${priceNum.toFixed(2)}).`,
          );
          return;
        }

        // S2: Deposit equals full price — suggest Full Upfront instead
        if (depositNum === priceNum) {
          toast.warning(
            "Deposit amount equals the full price. Consider switching to 'Full Upfront' payment model instead.",
            { duration: 5000 },
          );
          // Allow it but inform the vendor
        }

        resolvedDepositAmount = depositNum;
      }

      // S7: Pay Later also needs a valid price (already covered by S4, but explicit guard)
      if (preorderType === "pay_later" && priceNum <= 0) {
        toast.error("A price is required for the Pay Later pre-order model.");
        return;
      }
    }

    startTransition(async () => {
      try {
        const primaryThumbnail = media[0]?.url || "";
        const result = await addProductAction({
          name,
          type,
          description,
          priceInDollars: priceNum,
          imageUrl: primaryThumbnail,
          media: media,
          categoryId,
          quantity: type === "product" ? quantityNum : undefined,
          branchId:
            type === "product" && isMultiBranchActive && stockAllocationMode === "target_branch"
              ? selectedBranchId
              : undefined,
          stockAvailability: type === "product" ? stockAvailability : undefined,
          // Pre-order fields
          preorderType: isPreorder ? preorderType : undefined,
          preorderDepositAmount:
            isPreorder && preorderType === "deposit" ? resolvedDepositAmount : null,
          preorderMaxQuantity: isPreorder ? resolvedMaxQuantity : null,
        });

        if (result?.data?.success) {
          toast.success(`"${name}" added successfully!`);
          router.refresh();

          setName("");
          setDescription("");
          setPrice("");
          setCategoryId("");
          setMedia([]);
          setQuantity("0");
          setPreorderType("full_upfront");
          setPreorderDepositAmount("");
          setPreorderMaxQuantity("");

          window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          toast.error(result?.serverError || "Failed to add item.");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to add item.");
      }
    });
  };

  return (
    <AddProductContext.Provider
      value={{
        categories,
        maxMediaLimit,
        branches,
        isMultiBranchActive,
        stockAllocationMode,
        stockAvailabilityOptions,
        name,
        setName,
        type,
        setType,
        description,
        setDescription,
        price,
        setPrice,
        categoryId,
        setCategoryId,
        quantity,
        setQuantity,
        stockAvailability,
        setStockAvailability,
        preorderType,
        setPreorderType,
        preorderDepositAmount,
        setPreorderDepositAmount,
        preorderMaxQuantity,
        setPreorderMaxQuantity,
        selectedBranchId,
        setSelectedBranchId,
        media,
        uploadProgress,
        isUploading,
        fileInputRef,
        cameraInputRef,
        videoCameraInputRef,
        handleFileUpload,
        handleRemoveMedia,
        handleAddItem,
        isPending,
      }}
    >
      {children}
    </AddProductContext.Provider>
  );
}
