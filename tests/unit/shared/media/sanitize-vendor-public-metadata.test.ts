import { describe, expect, it } from 'vitest';
import { sanitizeVendorPublicMetadata } from '@/shared/media/sanitize-vendor-public-metadata';

describe('sanitizeVendorPublicMetadata', () => {
  it('removes bank transfer fields from storefront metadata', () => {
    expect(
      sanitizeVendorPublicMetadata({
        description: 'Hardware store',
        bankName: 'Leak Bank',
        bankAccountNumber: '123456',
        bannerUrl: 'https://res.cloudinary.com/demo/image/upload/banner.jpg',
      })
    ).toEqual({
      description: 'Hardware store',
      bannerUrl: 'https://res.cloudinary.com/demo/image/upload/banner.jpg',
    });
  });

  it('drops unknown keys', () => {
    expect(
      sanitizeVendorPublicMetadata({
        description: 'Shop',
        secretField: 'nope',
      })
    ).toEqual({
      description: 'Shop',
    });
  });
});
