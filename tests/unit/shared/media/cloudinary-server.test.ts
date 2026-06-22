import { describe, expect, it } from 'vitest';
import { signCloudinaryUploadParams } from '@/shared/media/cloudinary-signing';

describe('signCloudinaryUploadParams', () => {
  it('creates a stable Cloudinary SHA-1 signature', () => {
    const signature = signCloudinaryUploadParams(
      {
        folder: 'dilnova/vendors/org_123/catalog',
        timestamp: 1_700_000_000,
      },
      'test_api_secret'
    );

    expect(signature).toMatch(/^[a-f0-9]{64}$/);
    expect(signature).toBe(
      signCloudinaryUploadParams(
        {
          folder: 'dilnova/vendors/org_123/catalog',
          timestamp: 1_700_000_000,
        },
        'test_api_secret'
      )
    );
  });
});
