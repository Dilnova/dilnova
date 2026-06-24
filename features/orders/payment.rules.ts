import { SIMULATED_ORDER_STATUSES, type SimulatedOrderStatus } from '@/features/orders/status';
import { isBankTransferPayment } from '@/features/billing/bank-transfer';

export const COD_PAYMENT_ID = 'cash_on_delivery';

export function isCodPayment(paymentMethodId: string): boolean {
  return paymentMethodId === COD_PAYMENT_ID;
}

export function canUploadPaymentSlip(order: {
  paymentMethod: string;
  status: string;
}): boolean {
  return (
    isBankTransferPayment(order.paymentMethod) &&
    order.status === 'pending_payment'
  );
}

export function canVerifyBankTransferPayment(order: {
  paymentMethod: string;
  status: string;
  paymentSlipUrl?: string | null;
}): boolean {
  return (
    isBankTransferPayment(order.paymentMethod) &&
    order.status === 'payment_submitted' &&
    Boolean(order.paymentSlipUrl)
  );
}

export function canFulfillCodOrder(order: {
  paymentMethod: string;
  status: string;
}): boolean {
  return isCodPayment(order.paymentMethod) && order.status === 'pending_payment';
}

export function isTerminalOrderStatus(status: string): boolean {
  return status === 'fulfilled' || status === 'cancelled';
}

export function assertSimulatedOrderStatus(value: string): SimulatedOrderStatus | null {
  return (SIMULATED_ORDER_STATUSES as readonly string[]).includes(value)
    ? (value as SimulatedOrderStatus)
    : null;
}
