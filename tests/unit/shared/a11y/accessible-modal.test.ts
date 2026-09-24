import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

describe("AccessibleModal Focus Restoration & ARIA Dialog Semantics (§6 A11y / Item 6.4)", () => {
  const rootDir = path.resolve(__dirname, "../../../../");

  describe("AccessibleModal.tsx core component", () => {
    const modalFilePath = path.join(rootDir, "shared/ui/AccessibleModal.tsx");
    const modalContent = fs.readFileSync(modalFilePath, "utf-8");

    it("exports AccessibleModal and AccessibleModalProps", () => {
      expect(modalContent).toContain("export function AccessibleModal");
      expect(modalContent).toContain("export interface AccessibleModalProps");
    });

    it("declares accessibility props for labeling and focus management", () => {
      expect(modalContent).toContain("ariaLabelledBy?: string;");
      expect(modalContent).toContain("ariaLabel?: string;");
      expect(modalContent).toContain("ariaDescribedBy?: string;");
      expect(modalContent).toContain("returnFocus?: boolean;");
      expect(modalContent).toContain("restoreFocusRef?: RefObject<HTMLElement | null>;");
    });

    it("stores document.activeElement before trapping focus on open", () => {
      expect(modalContent).toContain("previousFocusRef.current = document.activeElement");
    });

    it("restores focus to the trigger element on unmount/close via requestAnimationFrame", () => {
      expect(modalContent).toContain("if (returnFocus)");
      expect(modalContent).toContain(
        "const elementToRestore = explicitRestoreTarget ?? previousFocusRef.current;",
      );
      expect(modalContent).toContain("elementToRestore.focus();");
      expect(modalContent).toContain("window.requestAnimationFrame(doFocus);");
    });

    it("applies role='dialog', aria-modal='true', and dynamic aria-labelledby/aria-label", () => {
      expect(modalContent).toContain('role="dialog"');
      expect(modalContent).toContain('aria-modal="true"');
      expect(modalContent).toContain("aria-labelledby={ariaLabelledBy}");
      expect(modalContent).toContain(
        'aria-label={!ariaLabelledBy ? (ariaLabel || "Dialog") : undefined}',
      );
      expect(modalContent).toContain("aria-describedby={ariaDescribedBy}");
    });
  });

  describe("Consumer Modals Label Association (§6 A11y)", () => {
    it("OrgTaxSettingsForm.tsx associates modal with custom tax rate heading", () => {
      const filePath = path.join(
        rootDir,
        "features/organization/components/OrgTaxSettingsForm.tsx",
      );
      const content = fs.readFileSync(filePath, "utf-8");

      expect(content).toContain('ariaLabelledBy="edit-custom-tax-title"');
      expect(content).toContain('id="edit-custom-tax-title"');
    });

    it("IMSLicenseModal.tsx associates modal with license modal heading", () => {
      const filePath = path.join(rootDir, "features/superadmin/components/IMSLicenseModal.tsx");
      const content = fs.readFileSync(filePath, "utf-8");

      expect(content).toContain('ariaLabelledBy="ims-license-modal-title"');
      expect(content).toContain('id="ims-license-modal-title"');
    });

    it("CategoriesTab.tsx associates category modal with category heading", () => {
      const filePath = path.join(rootDir, "features/superadmin/components/tabs/CategoriesTab.tsx");
      const content = fs.readFileSync(filePath, "utf-8");

      expect(content).toContain('ariaLabelledBy="category-modal-title"');
      expect(content).toContain('id="category-modal-title"');
    });

    it("PricingTab.tsx associates pricing plan modal with plan heading", () => {
      const filePath = path.join(rootDir, "features/superadmin/components/tabs/PricingTab.tsx");
      const content = fs.readFileSync(filePath, "utf-8");

      expect(content).toContain('ariaLabelledBy="pricing-plan-modal-title"');
      expect(content).toContain('id="pricing-plan-modal-title"');
    });

    it("TaxClassesManager.tsx associates both create and edit modals with their headings", () => {
      const filePath = path.join(
        rootDir,
        "features/superadmin/components/tabs/TaxClassesManager.tsx",
      );
      const content = fs.readFileSync(filePath, "utf-8");

      expect(content).toContain('ariaLabelledBy="add-tax-class-modal-title"');
      expect(content).toContain('id="add-tax-class-modal-title"');

      expect(content).toContain('ariaLabelledBy="edit-tax-class-modal-title"');
      expect(content).toContain('id="edit-tax-class-modal-title"');
    });

    it("ProductEditModal.tsx associates product edit modal with listing title", () => {
      const filePath = path.join(
        rootDir,
        "features/superadmin/components/tabs/products/ProductEditModal.tsx",
      );
      const content = fs.readFileSync(filePath, "utf-8");

      expect(content).toContain('ariaLabelledBy="edit-product-listing-title"');
      expect(content).toContain('id="edit-product-listing-title"');
    });
  });

  describe("InventoryModal.tsx defense-in-depth labeling", () => {
    const invModalPath = path.join(rootDir, "features/inventory/components/InventoryModal.tsx");
    const invContent = fs.readFileSync(invModalPath, "utf-8");

    it("supports ariaLabelledBy and ariaLabel with fallback to Dialog", () => {
      expect(invContent).toContain("ariaLabelledBy?: string;");
      expect(invContent).toContain("ariaLabel?: string;");
      expect(invContent).toContain("aria-labelledby={ariaLabelledBy}");
      expect(invContent).toContain(
        'aria-label={!ariaLabelledBy ? (ariaLabel || "Dialog") : undefined}',
      );
    });
  });
});
