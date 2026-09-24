import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

describe("Form Inputs Accessibility & Label Associations (§6 A11y)", () => {
  const rootDir = path.resolve(__dirname, "../../../../");

  describe("VendorProfileForm.tsx accessibility", () => {
    const filePath = path.join(rootDir, "features/vendor/components/VendorProfileForm.tsx");
    const content = fs.readFileSync(filePath, "utf-8");

    it("associates Store Description label with textarea via htmlFor and id", () => {
      expect(content).toContain('htmlFor="vendor-description"');
      expect(content).toContain('id="vendor-description"');
    });

    it("provides accessible names for hidden file and camera inputs", () => {
      expect(content).toContain('aria-label="Upload storefront banner image"');
      expect(content).toContain('aria-label="Take storefront banner photo"');
    });

    it("associates Bank Details form inputs with their respective labels via htmlFor and id", () => {
      expect(content).toContain('htmlFor="vendor-bank-name"');
      expect(content).toContain('id="vendor-bank-name"');

      expect(content).toContain('htmlFor="vendor-bank-account-name"');
      expect(content).toContain('id="vendor-bank-account-name"');

      expect(content).toContain('htmlFor="vendor-bank-account-number"');
      expect(content).toContain('id="vendor-bank-account-number"');

      expect(content).toContain('htmlFor="vendor-bank-branch-code"');
      expect(content).toContain('id="vendor-bank-branch-code"');

      expect(content).toContain('htmlFor="vendor-bank-instructions"');
      expect(content).toContain('id="vendor-bank-instructions"');
    });

    it("uses WCAG AA compliant text color for small font hints and labels", () => {
      expect(content).toContain("text-purple-700 dark:text-purple-400");
      expect(content).not.toContain("text-zinc-400 font-mono\n        </p>");
    });
  });

  describe("POSTicketPanel.tsx accessibility", () => {
    const filePath = path.join(rootDir, "features/billing/components/pos-parts/POSTicketPanel.tsx");
    const content = fs.readFileSync(filePath, "utf-8");

    it("provides an accessible label and id for customerName input", () => {
      expect(content).toContain('htmlFor="pos-customer-name"');
      expect(content).toContain('id="pos-customer-name"');
      expect(content).toContain('aria-label="Customer Name (Optional)"');
    });

    it("provides an accessible label and id for cashTendered input", () => {
      expect(content).toContain('htmlFor="pos-cash-tendered"');
      expect(content).toContain('id="pos-cash-tendered"');
      expect(content).toContain('aria-label="Cash tendered amount"');
    });

    it("provides an accessible label and id for receipt checkout notes textarea", () => {
      expect(content).toContain('htmlFor="pos-checkout-notes"');
      expect(content).toContain('id="pos-checkout-notes"');
      expect(content).toContain('aria-label="Receipt checkout notes"');
    });

    it("provides accessible aria-label on cart item removal button", () => {
      expect(content).toContain("aria-label={`Remove ${item.product.productName} from ticket`}");
    });
  });

  describe("facebook-shop/page.tsx accessibility", () => {
    const filePath = path.join(rootDir, "app/(vendor)/vendor/settings/facebook-shop/page.tsx");
    const content = fs.readFileSync(filePath, "utf-8");

    it("associates Facebook Page Access Token label and input", () => {
      expect(content).toContain('htmlFor="fb-page-access-token"');
      expect(content).toContain('id="fb-page-access-token"');
      expect(content).toContain('aria-label="Paste Access Token (User or Page Token)"');
      expect(content).toContain(
        'aria-label={showPageToken ? "Hide access token" : "Show access token"}',
      );
    });

    it("associates Facebook Page ID label and input", () => {
      expect(content).toContain('htmlFor="fb-page-id"');
      expect(content).toContain('id="fb-page-id"');
      expect(content).toContain('aria-label="Facebook Page ID (Numeric)"');
    });

    it("associates Instagram Business Account ID label and input", () => {
      expect(content).toContain('htmlFor="ig-account-id"');
      expect(content).toContain('id="ig-account-id"');
      expect(content).toContain('aria-label="Instagram Business Account ID (Numeric)"');
    });

    it("associates Pinterest Access Token and Board inputs", () => {
      expect(content).toContain('htmlFor="pinterest-access-token"');
      expect(content).toContain('id="pinterest-access-token"');
      expect(content).toContain('aria-label="Pinterest API v5 Access Token"');

      expect(content).toContain('htmlFor="pinterest-board-id"');
      expect(content).toContain('id="pinterest-board-id"');
      expect(content).toContain('aria-label="Selected Board ID (Numeric)"');

      expect(content).toContain('htmlFor="pinterest-board-name"');
      expect(content).toContain('id="pinterest-board-name"');
      expect(content).toContain('aria-label="Board Name (Display Label)"');
    });

    it("associates Brand Name and Caption Template inputs", () => {
      expect(content).toContain('htmlFor="social-brand-name"');
      expect(content).toContain('id="social-brand-name"');
      expect(content).toContain('aria-label="Store / Brand Display Name"');

      expect(content).toContain('htmlFor="custom-post-template"');
      expect(content).toContain('id="custom-post-template"');
      expect(content).toContain('aria-label="Custom Post Caption Template"');
    });

    it("associates Meta Catalog and Webhook inputs", () => {
      expect(content).toContain('htmlFor="meta-catalog-id"');
      expect(content).toContain('id="meta-catalog-id"');
      expect(content).toContain('aria-label="Meta Catalog ID (Numeric)"');

      expect(content).toContain('htmlFor="meta-system-user-token"');
      expect(content).toContain('id="meta-system-user-token"');
      expect(content).toContain('aria-label="Meta System User Token"');

      expect(content).toContain('htmlFor="social-webhook-url"');
      expect(content).toContain('id="social-webhook-url"');
      expect(content).toContain('aria-label="Webhook Endpoint URL (HTTPS)"');
    });

    it("associates bulk action checkboxes with labels and ids", () => {
      expect(content).toContain('htmlFor="force-repost-pinterest"');
      expect(content).toContain('id="force-repost-pinterest"');
      expect(content).toContain('aria-label="Force repost existing products to Pinterest"');

      expect(content).toContain('htmlFor="force-repost-feed"');
      expect(content).toContain('id="force-repost-feed"');
      expect(content).toContain('aria-label="Force repost existing products to Facebook Feed"');

      expect(content).toContain('htmlFor="force-repost-instagram"');
      expect(content).toContain('id="force-repost-instagram"');
      expect(content).toContain('aria-label="Force repost existing products to Instagram Grid"');
    });
  });
});
