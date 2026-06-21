import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  isOptionalCloudinaryDeliveryUrl,
  optionalCloudinaryUrlSchema,
  productMediaItemSchema,
} from '@/shared/media/validate-cloudinary-media';

const SAMPLE_URL =
  'https://res.cloudinary.com/deg48jhcz/image/upload/v1780290518/catalog/product.jpg';

describe('validate-cloudinary-media', () => {
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

  it('allows empty optional URLs', () => {
    expect(isOptionalCloudinaryDeliveryUrl('')).toBe(true);
    expect(optionalCloudinaryUrlSchema.safeParse('').success).toBe(true);
  });

  it('allows configured Cloudinary delivery URLs', () => {
    expect(isOptionalCloudinaryDeliveryUrl(SAMPLE_URL)).toBe(true);
    expect(optionalCloudinaryUrlSchema.safeParse(SAMPLE_URL).success).toBe(true);
  });

  it('rejects external hosts', () => {
    expect(isOptionalCloudinaryDeliveryUrl('https://evil.example/tracker.gif')).toBe(false);
    expect(optionalCloudinaryUrlSchema.safeParse('https://evil.example/tracker.gif').success).toBe(
      false
    );
  });

  it('rejects other Cloudinary clouds', () => {
    expect(
      productMediaItemSchema.safeParse({
        url: 'https://res.cloudinary.com/demo/image/upload/v1/product.jpg',
        type: 'image',
      }).success
    ).toBe(false);
  });

  it('accepts valid product media items', () => {
    expect(
      productMediaItemSchema.safeParse({
        url: SAMPLE_URL,
        type: 'video',
      }).success
    ).toBe(true);
  });
});
