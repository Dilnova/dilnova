import { logger } from '@/shared/logging/logger';
import { isBankTransferPayment, hasCompleteBankDetails } from '@/features/billing/bank-transfer';
import { isPaymentCompatibleWithFulfillment } from '@/features/organization/checkout-options.shared';

export function validatePayment(opts: {
  payment: string;
  paymentOption: any;
  fulfillmentOption: any;
  vendorOrgIds: string[];
  bankDetailsByOrg: Record<string, any>;
  uniqueItemIds: string[];
}) {
  const {
    payment,
    paymentOption,
    fulfillmentOption,
    vendorOrgIds,
    bankDetailsByOrg,
    uniqueItemIds,
  } = opts;

  if (isBankTransferPayment(payment)) {
    const vendorsMissingBankDetails = vendorOrgIds.filter(
      (orgId) => !hasCompleteBankDetails(bankDetailsByOrg[orgId]?.bankDetails)
    );
    if (vendorsMissingBankDetails.length > 0) {
      const vendorNames = vendorsMissingBankDetails.map(
        (orgId) => bankDetailsByOrg[orgId]?.vendorName || 'A vendor'
      );
      logger.warn('Checkout business validation failed', {
        reason: 'Missing bank details',
        vendors: vendorNames,
        cartItems: uniqueItemIds,
      });
      return {
        success: false,
        error: `Bank transfer is unavailable because bank details are not configured for: ${vendorNames.join(
          ', '
        )}. Please contact the store or choose another payment method.`,
      };
    }
  }

  if (!isPaymentCompatibleWithFulfillment(paymentOption, fulfillmentOption)) {
    const reason = paymentOption.requiresDelivery
      ? 'delivery orders, not store pickup.'
      : 'store pickup orders, not home delivery.';
    logger.warn('Checkout business validation failed', {
      reason: 'Incompatible payment and fulfillment',
      payment: paymentOption.id,
      fulfillment: fulfillmentOption.id,
      cartItems: uniqueItemIds,
    });
    return {
      success: false,
      error: `${paymentOption.label} is only available for ${reason}`,
    };
  }

  return { success: true };
}
