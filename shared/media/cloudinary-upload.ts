import {
  createCloudinaryUploadSignatureAction,
  type CloudinaryUploadKind,
} from "@/features/media/cloudinary.actions";
import * as Sentry from "@sentry/nextjs";

interface UploadProgressEvent {
  percent: number;
  loaded: number;
  total: number;
}

interface UploadResult {
  success: boolean;
  publicUrl?: string;
  publicId?: string;
  error?: string;
}

export interface CloudinaryUploadOptions {
  uploadKind?: CloudinaryUploadKind;
  onProgress?: (progress: UploadProgressEvent) => void;
}

/**
 * Uploads media via Cloudinary signed uploads (server-issued signature, no public preset).
 */
export async function uploadToCloudinary(
  file: File,
  options?: CloudinaryUploadOptions | ((progress: UploadProgressEvent) => void),
): Promise<UploadResult> {
  const normalizedOptions: CloudinaryUploadOptions =
    typeof options === "function" ? { onProgress: options } : (options ?? {});

  const resourceType = file.type.startsWith("video/") ? "video" : "image";
  const signatureResult = await createCloudinaryUploadSignatureAction({
    uploadKind: normalizedOptions.uploadKind ?? "catalog",
    resourceType,
  });

  if (!signatureResult?.data) {
    return {
      success: false,
      error:
        signatureResult?.serverError ||
        signatureResult?.validationErrors?._errors?.[0] ||
        "Failed to get upload signature",
    };
  }

  const { cloudName, apiKey, timestamp, signature, folder } = signatureResult.data;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);
  formData.append("folder", folder);

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, true);

    const onProgress = normalizedOptions.onProgress;
    if (onProgress && xhr.upload) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress({
            percent,
            loaded: event.loaded,
            total: event.total,
          });
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status === 200) {
        try {
          const response = JSON.parse(xhr.responseText) as {
            secure_url?: string;
            public_id?: string;
          };
          resolve({
            success: true,
            publicUrl: response.secure_url,
            publicId: response.public_id,
          });
        } catch {
          resolve({
            success: false,
            error: "Failed to process server response.",
          });
        }
      } else {
        try {
          const response = JSON.parse(xhr.responseText) as {
            error?: { message?: string };
          };
          let errorMessage = response.error?.message || `Upload failed with status ${xhr.status}`;
          if (xhr.status === 403 && errorMessage.includes("missing permissions")) {
            errorMessage = `Cloudinary upload forbidden: API key lacks write permissions (actions=["create"]). Ensure your CLOUDINARY_API_KEY in environment variables has 'create' / upload permissions enabled in Cloudinary Access Keys.`;
          }
          Sentry.captureException(new Error(errorMessage), {
            extra: {
              status: xhr.status,
              uploadKind: normalizedOptions.uploadKind ?? "catalog",
            },
          });
          resolve({
            success: false,
            error: errorMessage,
          });
        } catch {
          const errStr = `Upload failed with status ${xhr.status}`;
          Sentry.captureException(new Error(errStr), {
            extra: { status: xhr.status },
          });
          resolve({
            success: false,
            error: errStr,
          });
        }
      }
    };

    xhr.onerror = () => {
      const netErrStr = "Network error occurred during upload to Cloudinary.";
      Sentry.captureException(new Error(netErrStr), {
        extra: { uploadKind: normalizedOptions.uploadKind ?? "catalog" },
      });
      resolve({
        success: false,
        error: netErrStr,
      });
    };

    xhr.send(formData);
  });
}
