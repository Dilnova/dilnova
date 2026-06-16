import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { getCloudinaryCloudName, isAllowedCloudinaryDeliveryUrl } from '@/shared/media/cloudinary-url';

describe('cloudinaryUrl', () => {
  const originalCloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = 'deg48jhcz';
  });

  afterEach(() => {
    if (originalCloudName) {
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = originalCloudName;
    } else {
      delete process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    }
  });

  it('reads configured cloud name', () => {
    expect(getCloudinaryCloudName()).toBe('deg48jhcz');
  });

  it('allows delivery URLs from the configured cloud', () => {
    expect(
      isAllowedCloudinaryDeliveryUrl(
        'https://res.cloudinary.com/deg48jhcz/image/upload/v1780290518/slip.jpg'
      )
    ).toBe(true);
  });

  it('enforces orgId folders when orgId is provided', () => {
    // Valid URL matching orgId
    expect(
      isAllowedCloudinaryDeliveryUrl(
        'https://res.cloudinary.com/deg48jhcz/image/upload/v1780290518/dilnova/vendors/org_123/catalog/product.jpg',
        'org_123'
      )
    ).toBe(true);

    // Invalid URL matching different orgId
    expect(
      isAllowedCloudinaryDeliveryUrl(
        'https://res.cloudinary.com/deg48jhcz/image/upload/v1780290518/dilnova/vendors/org_456/catalog/product.jpg',
        'org_123'
      )
    ).toBe(false);

    // Invalid URL missing dilnova prefix
    expect(
      isAllowedCloudinaryDeliveryUrl(
        'https://res.cloudinary.com/deg48jhcz/image/upload/v1780290518/vendors/org_123/catalog/product.jpg',
        'org_123'
      )
    ).toBe(false);
  });

  it('rejects other cloud names', () => {
    expect(
      isAllowedCloudinaryDeliveryUrl('https://res.cloudinary.com/demo/image/upload/slip.jpg')
    ).toBe(false);
  });

  it('rejects non-cloudinary hosts', () => {
    expect(isAllowedCloudinaryDeliveryUrl('https://evil-site.com/fake-receipt.png')).toBe(false);
  });

  it('rejects http URLs', () => {
    expect(
      isAllowedCloudinaryDeliveryUrl('http://res.cloudinary.com/deg48jhcz/image/upload/slip.jpg')
    ).toBe(false);
  });
});
