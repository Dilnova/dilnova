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

/**
 * Uploads a file directly from the browser to Cloudinary using their Unsigned Upload Preset API.
 * Keeps upload credentials secure and supports real-time upload progress.
 */
export async function uploadToCloudinary(
  file: File,
  onProgress?: (progress: UploadProgressEvent) => void
): Promise<UploadResult> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default';

  if (!cloudName) {
    console.error('Error: NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is not set in environment variables.');
    return {
      success: false,
      error: 'Upload configuration error: Cloud name is missing.',
    };
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    const resourceType = file.type.startsWith('video/') ? 'video' : 'image';
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, true);

    // Track upload progress
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
          const response = JSON.parse(xhr.responseText);
          resolve({
            success: true,
            publicUrl: response.secure_url, // Direct HTTPS URL
            publicId: response.public_id,   // Cloudinary public ID for custom transforms
          });
        } catch (e) {
          console.error('Error parsing Cloudinary response:', e);
          resolve({
            success: false,
            error: 'Failed to process server response.',
          });
        }
      } else {
        console.error(`Cloudinary upload failed with status ${xhr.status}. Response: ${xhr.responseText}`);
        try {
          const response = JSON.parse(xhr.responseText);
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
        error: 'Network error occurred during upload to Cloudinary.',
      });
    };

    xhr.send(formData);
  });
}
