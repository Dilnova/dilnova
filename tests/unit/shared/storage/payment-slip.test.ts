import { describe, expect, it } from "vitest";
import {
  buildPaymentSlipStoragePath,
  isLegacyPaymentSlipUrl,
  isPaymentSlipStoragePath,
  resolvePaymentSlipExtension,
} from "@/shared/storage/payment-slip.shared";

describe("payment slip storage helpers", () => {
  it("detects legacy Cloudinary URLs", () => {
    expect(isLegacyPaymentSlipUrl("https://res.cloudinary.com/demo/image/upload/slip.jpg")).toBe(
      true,
    );
    expect(isLegacyPaymentSlipUrl("orders/f47ac10b-58cc-4372-a567-0e02b2c3d479/abc.jpg")).toBe(
      false,
    );
  });

  it("validates storage paths", () => {
    const orderId = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
    const path = buildPaymentSlipStoragePath(orderId, "jpg");
    expect(path.startsWith(`orders/${orderId}/`)).toBe(true);
    expect(isPaymentSlipStoragePath(path)).toBe(true);
    expect(isPaymentSlipStoragePath("../etc/passwd")).toBe(false);
  });

  it("maps allowed image mime types", () => {
    expect(resolvePaymentSlipExtension("image/jpeg")).toBe("image/jpeg");
    expect(resolvePaymentSlipExtension("application/pdf")).toBeNull();
  });
});
