import crypto from "crypto";

export type CloudinaryResourceType = "image" | "video";

export function signCloudinaryUploadParams(
  params: Record<string, string | number>,
  apiSecret: string,
): string {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  return crypto
    .createHash("sha256")
    .update(payload + apiSecret)
    .digest("hex");
}
