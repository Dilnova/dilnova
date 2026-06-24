/**
 * Detects if a URL is a video URL.
 * Checks for Cloudinary video segment or video extensions.
 */
export function isVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  
  // Cloudinary video URL formats contain /video/upload/
  if (url.includes('/video/upload/')) {
    return true;
  }
  
  // Also check standard video extensions
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv', '.3gp', '.flv', '.wmv'];
  try {
    const urlPath = new URL(url).pathname.toLowerCase();
    return videoExtensions.some(ext => urlPath.endsWith(ext));
  } catch {
    // If URL parsing fails, fallback to simple string check
    const lowerUrl = url.toLowerCase();
    return videoExtensions.some(ext => lowerUrl.endsWith(ext) || lowerUrl.includes(ext + '?'));
  }
}
