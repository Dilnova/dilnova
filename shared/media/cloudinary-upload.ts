import {
  createCloudinaryUploadSignatureAction,
  type CloudinaryUploadKind,
} from "@/features/media/cloudinary.actions";

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
          resolve({
            success: false,
            error: response.error?.message || `Upload failed with status ${xhr.status}`,
          });
        } catch {
          resolve({
            success: false,
            error: `Upload failed with status ${xhr.status}`,
          });
        }
      }
    };

    xhr.onerror = () => {
      resolve({
        success: false,
        error: "Network error occurred during upload to Cloudinary.",
      });
    };

    xhr.send(formData);
  });
}
