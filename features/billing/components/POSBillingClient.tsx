import type { VendorBillingRegisterData } from "@/features/billing/types";
import { POSBillingProvider } from "./POSBillingProvider";
import POSFullscreenWrapper from "./pos-parts/POSFullscreenWrapper";
import POSHeader from "./pos-parts/POSHeader";
import POSProductGrid from "./pos-parts/POSProductGrid";
import POSTicketPanel from "./pos-parts/POSTicketPanel";
import POSMobileCheckout from "./pos-parts/POSMobileCheckout";
import POSReceiptModal from "./pos-parts/POSReceiptModal";

interface Props {
  initialData: VendorBillingRegisterData;
  systemName?: string;
  orgName?: string;
  isAdmin?: boolean;
}

export default function POSBillingClient({
  initialData,
  systemName = "Dilnova",
  orgName,
  isAdmin = false,
}: Props) {
  return (
    <POSBillingProvider
      initialData={initialData}
      systemName={systemName}
      orgName={orgName}
      isAdmin={isAdmin}
    >
      <POSFullscreenWrapper>
        {/* Clean Minimal Header Bar */}
        <POSHeader />

        {/* Main Responsive POS Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
          {/* Left Side: Product Catalog */}
          <div className="md:col-span-7 lg:col-span-8">
            <POSProductGrid />
          </div>

          {/* Right Side: Desktop & Tablet Fixed Checkout Ticket Panel Card (Zero Outer Scroll) */}
          <div className="hidden md:block md:col-span-5 lg:col-span-4 bg-white border border-zinc-200 rounded-2xl p-4 dark:bg-zinc-900 dark:border-zinc-800 shadow-sm sticky top-3 self-start h-[calc(100vh-100px)] max-h-[720px] overflow-hidden">
            <POSTicketPanel />
          </div>
        </div>

        <POSMobileCheckout />
        <POSReceiptModal />
      </POSFullscreenWrapper>
    </POSBillingProvider>
  );
}
