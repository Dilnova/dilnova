# Cloudinary (next-cloudinary) — Official Reference

> **Version in use**: `next-cloudinary ^6.17.5`
> **Official docs**: https://next.cloudinary.dev

---

## Key Docs Links

| Topic | URL |
|---|---|
| next-cloudinary Docs | https://next.cloudinary.dev |
| CldUploadWidget | https://next.cloudinary.dev/clduploadwidget/basic-usage |
| CldImage | https://next.cloudinary.dev/cldimage/basic-usage |
| Cloudinary Upload API | https://cloudinary.com/documentation/image_upload_api_reference |
| Transformations | https://cloudinary.com/documentation/image_transformations |
| Cloudinary Dashboard | https://console.cloudinary.com |
| Node.js SDK | https://cloudinary.com/documentation/node_integration |

---

## How Dilnova Uses Cloudinary

- **Catalog image uploads** for vendor products
- Uses `next-cloudinary` CldUploadWidget for client-side uploads
- Server-side validation of upload signatures

### Environment Variables

```env
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Common Pattern

```tsx
'use client';

import { CldUploadWidget } from 'next-cloudinary';

export function ImageUpload({ onUpload }) {
  return (
    <CldUploadWidget
      uploadPreset="dilnova_catalog"
      onSuccess={(result) => onUpload(result.info.secure_url)}
    >
      {({ open }) => <button onClick={() => open()}>Upload Image</button>}
    </CldUploadWidget>
  );
}
```
