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

  describe("facebook-shop/page.tsx and settings components accessibility", () => {
    const pagePath = path.join(rootDir, "app/(vendor)/vendor/settings/facebook-shop/page.tsx");
    const settingsDir = path.join(rootDir, "features/social-share/components/settings");
    const content = [
      fs.readFileSync(pagePath, "utf-8"),
      ...(fs.existsSync(settingsDir)
        ? fs
            .readdirSync(settingsDir)
            .map((file) => fs.readFileSync(path.join(settingsDir, file), "utf-8"))
        : []),
    ].join("\n");

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

  describe("Color Contrast WCAG AA compliance across key components", () => {
    it("ensures TabDataTableLayout uses accessible high-contrast text for headers and subtitles", () => {
      const filePath = path.join(rootDir, "shared/ui/TabDataTableLayout.tsx");
      const content = fs.readFileSync(filePath, "utf-8");

      expect(content).toContain(
        "text-zinc-600 dark:text-zinc-400 font-semibold uppercase font-mono",
      );
      expect(content).toContain("text-zinc-600 dark:text-zinc-400 font-mono mt-0.5");
      expect(content).not.toContain(
        'className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 uppercase',
      );
    });

    it("ensures HeaderNav uses high-contrast text styles for navigation links", () => {
      const filePath = path.join(rootDir, "shared/ui/HeaderNav.tsx");
      const content = fs.readFileSync(filePath, "utf-8");

      expect(content).toContain(
        "text-zinc-650 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-100",
      );
      expect(content).toContain(
        "text-zinc-700 hover:text-zinc-950 dark:text-zinc-200 dark:hover:text-zinc-50",
      );
      expect(content).not.toContain(
        '"text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"',
      );
    });

    it("ensures shipping settings labels meet WCAG AA contrast and have label linkage", () => {
      const filePath = path.join(rootDir, "app/(vendor)/vendor/settings/shipping/page.tsx");
      const content = fs.readFileSync(filePath, "utf-8");

      expect(content).toContain("text-slate-700 dark:text-slate-300 uppercase block mb-1");
      expect(content).not.toContain("text-[10px] font-medium text-slate-400 dark:text-slate-500");
      expect(content).toContain("htmlFor={`shipping-${rule.zone}-base`}");
      expect(content).toContain("id={`shipping-${rule.zone}-base`}");
    });

    it("ensures CatalogLayout product card badges use accessible contrast", () => {
      const filePath = path.join(rootDir, "features/catalog/components/CatalogLayout.tsx");
      const content = fs.readFileSync(filePath, "utf-8");

      expect(content).toContain(
        "text-[9px] font-mono text-zinc-650 dark:text-zinc-400 font-semibold uppercase tracking-widest truncate",
      );
      expect(content).toContain("text-zinc-650 dark:text-zinc-400 font-medium block mb-0.5");
      expect(content).toContain(
        "text-xs font-mono text-zinc-650 dark:text-zinc-300 font-semibold px-2",
      );
    });
  });

  describe("CategorySelector and FAQ Accordion Accessibility (§6 A11y Finding #8)", () => {
    it("ensures CategorySelector trigger and clear buttons are semantic and accessible", () => {
      const filePath = path.join(rootDir, "shared/ui/CategorySelector.tsx");
      const content = fs.readFileSync(filePath, "utf-8");

      expect(content).toContain('type="button"');
      expect(content).toContain('aria-haspopup="listbox"');
      expect(content).toContain("aria-expanded={isOpen}");
      expect(content).toContain('aria-controls="category-selector-listbox"');
      expect(content).toContain('aria-label="Clear selected category"');
      expect(content).toContain('role="listbox"');
      expect(content).toContain('aria-label="Category options"');
      expect(content).toContain('role="option"');
      expect(content).toContain("aria-selected={isSelected}");
      expect(content).not.toContain(
        '<span\n              onClick={(e) => {\n                e.stopPropagation();\n                handleSelect("");\n              }}',
      );
    });

    it("ensures CategorySelector implements keyboard arrow navigation and Escape handler", () => {
      const filePath = path.join(rootDir, "shared/ui/CategorySelector.tsx");
      const content = fs.readFileSync(filePath, "utf-8");

      expect(content).toContain('case "ArrowDown":');
      expect(content).toContain('case "ArrowUp":');
      expect(content).toContain('case "Home":');
      expect(content).toContain('case "End":');
      expect(content).toContain('case "Escape":');
      expect(content).toContain('case "Enter":');
      expect(content).toContain("triggerButtonRef.current?.focus()");
    });

    it("ensures ProductBasicDetailsForm associates label with CategorySelector via htmlFor and id", () => {
      const filePath = path.join(
        rootDir,
        "features/catalog/components/add-product/ProductBasicDetailsForm.tsx",
      );
      const content = fs.readFileSync(filePath, "utf-8");

      expect(content).toContain('htmlFor="product-category-selector"');
      expect(content).toContain('id="product-category-selector"');
    });

    it("ensures SupportFAQAccordion implements the WAI-ARIA accordion pattern with headings and regions", () => {
      const filePath = path.join(rootDir, "features/contact/components/SupportFAQAccordion.tsx");
      const content = fs.readFileSync(filePath, "utf-8");

      expect(content).toContain('<h3 className="text-base font-semibold m-0">');
      expect(content).toContain("id={`faq-btn-${faq.id}`}");
      expect(content).toContain("aria-expanded={isOpen}");
      expect(content).toContain("aria-controls={`faq-panel-${faq.id}`}");
      expect(content).toContain("id={`faq-panel-${faq.id}`}");
      expect(content).toContain('role="region"');
      expect(content).toContain("aria-labelledby={`faq-btn-${faq.id}`}");
      expect(content).toContain("handleAccordionKeyDown");
      expect(content).toContain('e.key === "ArrowDown"');
      expect(content).toContain('e.key === "ArrowUp"');
      expect(content).toContain('e.key === "Home"');
      expect(content).toContain('e.key === "End"');
    });

    it("ensures SupportHubClient search and filter dismiss buttons have accessible labels", () => {
      const filePath = path.join(rootDir, "app/support/SupportHubClient.tsx");
      const content = fs.readFileSync(filePath, "utf-8");

      expect(content).toContain('aria-label="Search support topics, questions, and guides"');
      expect(content).toContain('aria-label="Clear search input"');
      expect(content).toContain('aria-label="Clear selected category filter"');
      expect(content).toContain('aria-label="Clear search filter"');
    });

    it("ensures SupportCategoryCards buttons have type=button and aria-pressed attributes", () => {
      const filePath = path.join(rootDir, "features/contact/components/SupportCategoryCards.tsx");
      const content = fs.readFileSync(filePath, "utf-8");

      expect(content).toContain('type="button"');
      expect(content).toContain("aria-pressed={isSelected}");
    });
  });
});
