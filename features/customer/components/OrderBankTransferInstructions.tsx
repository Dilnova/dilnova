import * as schema from "@/shared/db/schema";
import {
  allocateVendorPaymentAmounts,
  isBankTransferPayment,
} from "@/features/billing/bank-transfer";
import { buildBankTransferCheckoutInstructions } from "@/features/billing/bank-transfer.server";
import { getOrderDisplayTotals } from "@/features/billing/checkout-totals";
import BankTransferInstructions from "@/features/billing/components/BankTransferInstructions";

type OrderRecord = typeof schema.simulatedOrders.$inferSelect;

interface OrderBankTransferInstructionsProps {
  order: OrderRecord;
  items: {
    vendorOrgId: string;
    unitPrice: number;
    quantity: number;
  }[];
}

export default async function OrderBankTransferInstructions({
  order,
  items,
}: OrderBankTransferInstructionsProps) {
  if (!isBankTransferPayment(order.paymentMethod) || order.status !== "pending_payment") {
    return null;
  }

  const vendorSubtotals = items.reduce<Record<string, number>>((acc, item) => {
    acc[item.vendorOrgId] = (acc[item.vendorOrgId] || 0) + item.unitPrice * item.quantity;
    return acc;
  }, {});
  const serverSubtotal = Object.values(vendorSubtotals).reduce((sum, amount) => sum + amount, 0);
  const grandTotal = getOrderDisplayTotals(order).grandTotal;

  const bankTransferInstructions = await buildBankTransferCheckoutInstructions({
    orderId: order.id,
    grandTotalCents: grandTotal,
    vendorAmounts: allocateVendorPaymentAmounts(vendorSubtotals, serverSubtotal, grandTotal),
  });

  return (
    <div className="space-y-2">
      <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 font-mono">
        Bank Transfer Instructions
      </h4>
      <BankTransferInstructions instructions={bankTransferInstructions} compact />
    </div>
  );
}
