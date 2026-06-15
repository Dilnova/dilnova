import { describe, expect, it } from 'vitest';
import {
  bankDetailsToProfileFormFields,
  buildBankPrivateMetadataFromVendorData,
  hasBankTransferConfiguredForOrg,
  hasLegacyPublicBankMetadata,
  parseBankDetailsFromClerkOrg,
  stripBankFieldsFromPublic,
} from '@/features/billing/bank-transfer-metadata';

describe('bank-transfer-metadata', () => {
  it('reads bank details from privateMetadata first', () => {
    const details = parseBankDetailsFromClerkOrg({
      privateMetadata: {
        bankName: 'Private Bank',
        bankAccountName: 'Store',
        bankAccountNumber: '111',
      },
      publicMetadata: {
        bankName: 'Public Bank',
        bankAccountName: 'Leak',
        bankAccountNumber: '999',
      },
    });

    expect(details?.bankName).toBe('Private Bank');
    expect(details?.accountNumber).toBe('111');
  });

  it('ignores legacy publicMetadata bank fields', () => {
    const details = parseBankDetailsFromClerkOrg({
      privateMetadata: {},
      publicMetadata: {
        bankName: 'Legacy Bank',
        bankAccountName: 'Legacy Store',
        bankAccountNumber: '222',
      },
    });

    expect(details).toBeNull();
  });

  it('strips bank fields from public metadata', () => {
    const cleaned = stripBankFieldsFromPublic({
      description: 'Hello',
      bankName: 'Should go',
      bankAccountNumber: '123',
    });

    expect(cleaned).toEqual({ description: 'Hello' });
  });

  it('maps bank details to admin form fields', () => {
    expect(
      bankDetailsToProfileFormFields({
        bankName: 'CB',
        accountName: 'Shop',
        accountNumber: '99',
        branchCode: '01',
        instructions: 'Ref required',
      })
    ).toEqual({
      bankName: 'CB',
      bankAccountName: 'Shop',
      bankAccountNumber: '99',
      bankBranchCode: '01',
      bankTransferInstructions: 'Ref required',
    });
  });

  it('detects configured bank transfer from private metadata', () => {
    expect(
      hasBankTransferConfiguredForOrg({
        privateMetadata: {
          bankName: 'CB',
          bankAccountName: 'Shop',
          bankAccountNumber: '99',
        },
      })
    ).toBe(true);
  });

  it('detects legacy public bank metadata', () => {
    expect(hasLegacyPublicBankMetadata({ bankAccountNumber: '123' })).toBe(true);
    expect(hasLegacyPublicBankMetadata({ description: 'only public fields' })).toBe(false);
  });

  it('builds private metadata payload from vendor form data', () => {
    expect(
      buildBankPrivateMetadataFromVendorData({
        bankName: 'CB',
        bankAccountName: 'Shop',
        bankAccountNumber: '99',
        bankBranchCode: '01',
        bankTransferInstructions: 'Use ref',
      })
    ).toEqual({
      bankName: 'CB',
      bankAccountName: 'Shop',
      bankAccountNumber: '99',
      bankBranchCode: '01',
      bankTransferInstructions: 'Use ref',
    });
  });
});
