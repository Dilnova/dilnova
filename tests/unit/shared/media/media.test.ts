import { describe, expect, it } from "vitest";
import { isVideoUrl } from "@/shared/media/media";

describe("isVideoUrl", () => {
  it("should identify Cloudinary video URLs", () => {
    expect(
      isVideoUrl(
        "https://res.cloudinary.com/deg48jhcz/video/upload/v1780290518/a9vzcqfge5xcvm4dpkws.mp4",
      ),
    ).toBe(true);
    expect(isVideoUrl("http://res.cloudinary.com/demo/video/upload/dog.mp4")).toBe(true);
  });

  it("should identify other video URLs based on file extensions", () => {
    expect(isVideoUrl("https://example.com/video.mp4")).toBe(true);
    expect(isVideoUrl("https://example.com/assets/clip.webm")).toBe(true);
    expect(isVideoUrl("https://example.com/movie.mov?param=1")).toBe(true);
  });

  it("should reject image URLs", () => {
    expect(
      isVideoUrl(
        "https://res.cloudinary.com/deg48jhcz/image/upload/v1780290518/a9vzcqfge5xcvm4dpkws.jpg",
      ),
    ).toBe(false);
    expect(isVideoUrl("https://example.com/photo.png")).toBe(false);
    expect(isVideoUrl("https://example.com/photo.jpg?size=large")).toBe(false);
  });

  it("should handle null/undefined/empty string", () => {
    expect(isVideoUrl(null)).toBe(false);
    expect(isVideoUrl(undefined)).toBe(false);
    expect(isVideoUrl("")).toBe(false);
  });
});
