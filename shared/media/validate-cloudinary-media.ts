import { z } from "zod/v3";
import { isAllowedCloudinaryDeliveryUrl } from "@/shared/media/cloudinary-url";

export const CLOUDINARY_DELIVERY_URL_ERROR =
  "Media must be uploaded to your Cloudinary library (https://res.cloudinary.com/<your-cloud>/...).";

/** True when the value is empty or a Cloudinary delivery URL for this app. */
export function isOptionalCloudinaryDeliveryUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) {
    return true;
  }
  return isAllowedCloudinaryDeliveryUrl(trimmed);
}

export const optionalCloudinaryUrlSchema = z
  .string()
  .trim()
  .default("")
  .refine(isOptionalCloudinaryDeliveryUrl, { message: CLOUDINARY_DELIVERY_URL_ERROR });

export const requiredCloudinaryUrlSchema = z
  .string()
  .trim()
  .min(1, "Media URL is required.")
  .refine((url) => isAllowedCloudinaryDeliveryUrl(url), { message: CLOUDINARY_DELIVERY_URL_ERROR });

export const productMediaItemSchema = z.object({
  url: requiredCloudinaryUrlSchema,
  type: z.enum(["image", "video"]),
});
