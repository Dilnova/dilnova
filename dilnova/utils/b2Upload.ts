import { getPresignedUrl } from '@/app/actions/getPresignedUrl';

interface UploadProgressEvent {
  percent: number;
  loaded: number;
  total: number;
}

interface UploadResult {
  success: boolean;
  publicUrl?: string;
  error?: string;
}

/**
 * Uploads a file directly from the browser to Backblaze B2 using an S3 Presigned URL.
 * Emits upload progress percentages.
 */
export async function uploadFileToB2(
  file: File,
  onProgress?: (progress: UploadProgressEvent) => void
): Promise<UploadResult> {
  try {
    // 1. Get the secure upload URL from our Next.js Server Action
    const response = await getPresignedUrl(file.name, file.type);
    
    if (!response.success || !response.uploadUrl || !response.publicUrl) {
      return {
        success: false,
        error: response.error || 'Failed to generate upload authorization.',
      };
    }

    const { uploadUrl, publicUrl } = response;

    // 2. Perform direct upload to B2 S3 API using XMLHttpRequest (for progress tracking)
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      
      xhr.open('PUT', uploadUrl, true);
      xhr.setRequestHeader('Content-Type', file.type);

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
          resolve({
            success: true,
            publicUrl,
          });
        } else {
          console.error(`B2 Upload error response status: ${xhr.status}. Body: ${xhr.responseText}`);
          resolve({
            success: false,
            error: `Upload failed with status code ${xhr.status}`,
          });
        }
      };

      xhr.onerror = () => {
        resolve({
          success: false,
          error: 'Network error occurred during upload to storage.',
        });
      };

      xhr.send(file);
    });
  } catch (error) {
    console.error('Error during client B2 upload:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred during upload.',
    };
  }
}
