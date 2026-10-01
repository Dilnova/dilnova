import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  buildPaymentSlipStoragePath,
  isLegacyPaymentSlipUrl,
  isPaymentSlipStoragePath,
  resolvePaymentSlipExtension,
  resolvePaymentSlipExtensionFromFilename,
  detectImageMimeTypeFromMagicBytes,
  isAllowedImageMagicBytes,
} from "@/shared/storage/payment-slip.shared";
import {
  uploadPaymentSlipToStorage,
  deletePaymentSlipFromStorage,
  verifyPaymentSlipMagicBytes,
} from "@/shared/storage/payment-slip";

const uploadMock = vi.fn();
const removeMock = vi.fn();
const downloadMock = vi.fn();
const createSignedUrlMock = vi.fn();

vi.mock("@/shared/storage/admin-client", () => ({
  isSupabaseStorageConfigured: vi.fn(() => true),
  createSupabaseAdminClient: vi.fn(() => ({
    storage: {
      from: vi.fn(() => ({
        upload: uploadMock,
        remove: removeMock,
        download: downloadMock,
        createSignedUrl: createSignedUrlMock,
      })),
    },
  })),
}));

describe("payment slip storage helpers", () => {
  const orderId = "f47ac10b-58cc-4372-a567-0e02b2c3d479";

  const pngBytes = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  ]);
  const jpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
  const gif87Bytes = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x37, 0x61, 0x01, 0x00, 0x01, 0x00]);
  const gif89Bytes = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00]);
  const webpBytes = Buffer.from([
    0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38,
  ]);

  const htmlPayload = Buffer.from("<!DOCTYPE html><html><script>alert('xss')</script></html>");
  const svgPayload = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
  );
  const phpPayload = Buffer.from("<?php echo 'shell'; ?>");
  const exePayload = Buffer.from("MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff");
  const elfPayload = Buffer.from("\x7fELF\x02\x01\x01\x00\x00\x00\x00\x00");
  const pdfPayload = Buffer.from("%PDF-1.4\n%test\n");
  const zipPayload = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00]);
  const wavPayload = Buffer.from([
    0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45,
  ]);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("URL and path helpers", () => {
    it("detects legacy Cloudinary URLs", () => {
      expect(isLegacyPaymentSlipUrl("https://res.cloudinary.com/demo/image/upload/slip.jpg")).toBe(
        true,
      );
      expect(isLegacyPaymentSlipUrl("orders/f47ac10b-58cc-4372-a567-0e02b2c3d479/abc.jpg")).toBe(
        false,
      );
    });

    it("validates storage paths", () => {
      const path = buildPaymentSlipStoragePath(orderId, "jpg");
      expect(path.startsWith(`orders/${orderId}/`)).toBe(true);
      expect(isPaymentSlipStoragePath(path)).toBe(true);
      expect(isPaymentSlipStoragePath("../etc/passwd")).toBe(false);
      expect(isPaymentSlipStoragePath("invalid-path")).toBe(false);
    });

    it("maps allowed image mime types", () => {
      expect(resolvePaymentSlipExtension("image/jpeg")).toBe("image/jpeg");
      expect(resolvePaymentSlipExtension("image/png")).toBe("image/png");
      expect(resolvePaymentSlipExtension("image/webp")).toBe("image/webp");
      expect(resolvePaymentSlipExtension("image/gif")).toBe("image/gif");
      expect(resolvePaymentSlipExtension("application/pdf")).toBeNull();
      expect(resolvePaymentSlipExtension("image/svg+xml")).toBeNull();
    });

    it("resolves extension from filenames", () => {
      expect(resolvePaymentSlipExtensionFromFilename("slip.jpg")).toBe("image/jpeg");
      expect(resolvePaymentSlipExtensionFromFilename("slip.jpeg")).toBe("image/jpeg");
      expect(resolvePaymentSlipExtensionFromFilename("slip.png")).toBe("image/png");
      expect(resolvePaymentSlipExtensionFromFilename("slip.webp")).toBe("image/webp");
      expect(resolvePaymentSlipExtensionFromFilename("slip.gif")).toBe("image/gif");
      expect(resolvePaymentSlipExtensionFromFilename("slip.svg")).toBeNull();
      expect(resolvePaymentSlipExtensionFromFilename("slip.exe")).toBeNull();
    });
  });

  describe("magic bytes detection (Finding 13.1)", () => {
    it("identifies valid PNG images", () => {
      expect(detectImageMimeTypeFromMagicBytes(pngBytes)).toBe("image/png");
      expect(detectImageMimeTypeFromMagicBytes(new Uint8Array(pngBytes))).toBe("image/png");
      expect(isAllowedImageMagicBytes(pngBytes)).toBe(true);
      expect(isAllowedImageMagicBytes(pngBytes, "image/png")).toBe(true);
      expect(isAllowedImageMagicBytes(pngBytes, "image/jpeg")).toBe(false);
    });

    it("identifies valid JPEG images", () => {
      expect(detectImageMimeTypeFromMagicBytes(jpegBytes)).toBe("image/jpeg");
      expect(detectImageMimeTypeFromMagicBytes(new Uint8Array(jpegBytes))).toBe("image/jpeg");
      expect(isAllowedImageMagicBytes(jpegBytes)).toBe(true);
      expect(isAllowedImageMagicBytes(jpegBytes, "image/jpeg")).toBe(true);
      expect(isAllowedImageMagicBytes(jpegBytes, "image/png")).toBe(false);
    });

    it("identifies valid GIF images (GIF87a and GIF89a)", () => {
      expect(detectImageMimeTypeFromMagicBytes(gif87Bytes)).toBe("image/gif");
      expect(detectImageMimeTypeFromMagicBytes(gif89Bytes)).toBe("image/gif");
      expect(isAllowedImageMagicBytes(gif87Bytes, "image/gif")).toBe(true);
      expect(isAllowedImageMagicBytes(gif89Bytes, "image/gif")).toBe(true);
    });

    it("identifies valid WebP images", () => {
      expect(detectImageMimeTypeFromMagicBytes(webpBytes)).toBe("image/webp");
      expect(isAllowedImageMagicBytes(webpBytes)).toBe(true);
      expect(isAllowedImageMagicBytes(webpBytes, "image/webp")).toBe(true);
      expect(isAllowedImageMagicBytes(webpBytes, "image/png")).toBe(false);
    });

    it("rejects malicious or non-image payloads", () => {
      const maliciousPayloads = [
        { name: "HTML", data: htmlPayload },
        { name: "SVG", data: svgPayload },
        { name: "PHP script", data: phpPayload },
        { name: "Windows PE executable", data: exePayload },
        { name: "Linux ELF executable", data: elfPayload },
        { name: "PDF document", data: pdfPayload },
        { name: "Zip archive", data: zipPayload },
        { name: "RIFF non-WebP (WAV)", data: wavPayload },
        { name: "Empty buffer", data: Buffer.alloc(0) },
        { name: "Truncated 2-byte buffer", data: Buffer.from([0xff, 0xd8]) },
      ];

      for (const payload of maliciousPayloads) {
        expect(detectImageMimeTypeFromMagicBytes(payload.data)).toBeNull();
        expect(isAllowedImageMagicBytes(payload.data)).toBe(false);
      }
    });
  });

  describe("uploadPaymentSlipToStorage validation", () => {
    it("rejects non-image payloads before uploading to Supabase", async () => {
      await expect(
        uploadPaymentSlipToStorage({
          orderId,
          bytes: htmlPayload,
          contentType: "image/jpeg",
        }),
      ).rejects.toThrow(
        "Invalid image binary format: magic bytes do not match expected image type.",
      );

      expect(uploadMock).not.toHaveBeenCalled();
    });

    it("rejects mismatched content type and binary signature", async () => {
      await expect(
        uploadPaymentSlipToStorage({
          orderId,
          bytes: pngBytes,
          contentType: "image/jpeg",
        }),
      ).rejects.toThrow(
        "Invalid image binary format: magic bytes do not match expected image type.",
      );

      expect(uploadMock).not.toHaveBeenCalled();
    });

    it("uploads when binary signature matches content type", async () => {
      uploadMock.mockResolvedValueOnce({ error: null });

      const path = await uploadPaymentSlipToStorage({
        orderId,
        bytes: pngBytes,
        contentType: "image/png",
      });

      expect(uploadMock).toHaveBeenCalledTimes(1);
      expect(path).toMatch(new RegExp(`^orders/${orderId}/[0-9a-f-]{36}\\.png$`));
    });

    it("throws when Supabase upload encounters an error", async () => {
      uploadMock.mockResolvedValueOnce({ error: new Error("Bucket quota exceeded") });

      await expect(
        uploadPaymentSlipToStorage({
          orderId,
          bytes: jpegBytes,
          contentType: "image/jpeg",
        }),
      ).rejects.toThrow("Bucket quota exceeded");
    });
  });

  describe("deletePaymentSlipFromStorage", () => {
    it("rejects invalid storage path without calling Supabase", async () => {
      const result = await deletePaymentSlipFromStorage("../../etc/passwd");
      expect(result).toBe(false);
      expect(removeMock).not.toHaveBeenCalled();
    });

    it("deletes file from storage bucket for valid path", async () => {
      removeMock.mockResolvedValueOnce({ error: null });
      const validPath = `orders/${orderId}/a0000000-0000-0000-0000-000000000001.png`;

      const result = await deletePaymentSlipFromStorage(validPath);
      expect(result).toBe(true);
      expect(removeMock).toHaveBeenCalledWith([validPath]);
    });

    it("returns false when Supabase remove fails", async () => {
      removeMock.mockResolvedValueOnce({ error: new Error("Storage failure") });
      const validPath = `orders/${orderId}/a0000000-0000-0000-0000-000000000001.png`;

      const result = await deletePaymentSlipFromStorage(validPath);
      expect(result).toBe(false);
    });
  });

  describe("verifyPaymentSlipMagicBytes", () => {
    const validPath = `orders/${orderId}/a0000000-0000-0000-0000-000000000001.png`;

    it("returns false for invalid path", async () => {
      const result = await verifyPaymentSlipMagicBytes("malicious-path");
      expect(result).toBe(false);
    });

    it("verifies successfully via direct download", async () => {
      const fakeBlob = new Blob([pngBytes]);
      downloadMock.mockResolvedValueOnce({ data: fakeBlob, error: null });

      const result = await verifyPaymentSlipMagicBytes(validPath);
      expect(result).toBe(true);
    });

    it("falls back to signed URL fetch if direct download fails", async () => {
      downloadMock.mockResolvedValueOnce({
        data: null,
        error: new Error("Direct download failed"),
      });
      createSignedUrlMock.mockResolvedValueOnce({
        data: { signedUrl: "https://storage.supabase.co/signed/slip.png" },
        error: null,
      });

      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(new Response(pngBytes, { status: 200 }));

      const result = await verifyPaymentSlipMagicBytes(validPath);
      expect(result).toBe(true);

      fetchSpy.mockRestore();
    });

    it("returns false if file content is non-image HTML", async () => {
      const fakeBlob = new Blob([htmlPayload]);
      downloadMock.mockResolvedValueOnce({ data: fakeBlob, error: null });

      const result = await verifyPaymentSlipMagicBytes(validPath);
      expect(result).toBe(false);
    });
  });
});
