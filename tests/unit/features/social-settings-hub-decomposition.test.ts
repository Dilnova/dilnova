import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

describe("Social Settings Hub Decomposition (§1 Quality Finding #1)", () => {
  const rootDir = path.resolve(__dirname, "../../../");
  const pagePath = path.join(rootDir, "app/(vendor)/vendor/settings/facebook-shop/page.tsx");
  const settingsDir = path.join(rootDir, "features/social-share/components/settings");

  it("decomposes monolithic facebook-shop/page.tsx from 3121 lines to under 160 lines", () => {
    const pageContent = fs.readFileSync(pagePath, "utf-8");
    const lineCount = pageContent.split("\n").length;

    // Previously 3121 lines monolithic component
    expect(lineCount).toBeLessThan(160);
    expect(pageContent).toContain("SocialSettingsHeader");
    expect(pageContent).toContain("ChannelNavigationTabs");
    expect(pageContent).toContain("ActiveChannelSettings");
    expect(pageContent).toContain("AutomationSidebar");
    expect(pageContent).toContain("ActivityLogsTable");
  });

  it("verifies all modular domain subcomponents exist and are exported from barrel", () => {
    const indexPath = path.join(settingsDir, "index.ts");
    const indexContent = fs.readFileSync(indexPath, "utf-8");

    const expectedExports = [
      "SocialSettingsHeader",
      "ChannelNavigationTabs",
      "ActiveChannelSettings",
      "FacebookFeedSettings",
      "WhatsAppSettings",
      "InstagramFeedSettings",
      "PinterestSettings",
      "PostTemplatesSettings",
      "MetaCatalogSettings",
      "WebhooksSettings",
      "AutomationSidebar",
      "ActivityLogsTable",
      "PlatformSetupGuide",
      "ChannelStatusDashboard",
      "ToggleSwitch",
      "useSocialSettingsHub",
    ];

    for (const exp of expectedExports) {
      expect(indexContent).toContain(exp);
      const componentFile = path.join(settingsDir, `${exp}.tsx`);
      const hookFile = path.join(settingsDir, `${exp}.ts`);
      expect(fs.existsSync(componentFile) || fs.existsSync(hookFile)).toBe(true);
    }
  });

  it("verifies ChannelNavigationTabs uses semantic WAI-ARIA tablist and tab roles", () => {
    const tabsFile = path.join(settingsDir, "ChannelNavigationTabs.tsx");
    const content = fs.readFileSync(tabsFile, "utf-8");

    expect(content).toContain('role="tablist"');
    expect(content).toContain('role="tab"');
    expect(content).toContain("aria-selected={isActive}");
    expect(content).toContain("aria-controls={`panel-${tab.id}`}");
    expect(content).toContain("id={`tab-${tab.id}`}");

    // 7 channels
    expect(content).toContain("facebook_feed");
    expect(content).toContain("whatsapp");
    expect(content).toContain("instagram_feed");
    expect(content).toContain("pinterest");
    expect(content).toContain("templates");
    expect(content).toContain("meta_catalog");
    expect(content).toContain("webhooks");
  });

  it("verifies SocialSettingsHeader provides accessible navigation and action controls", () => {
    const headerFile = path.join(settingsDir, "SocialSettingsHeader.tsx");
    const content = fs.readFileSync(headerFile, "utf-8");

    expect(content).toContain('aria-label="Breadcrumb"');
    expect(content).toContain('type="button"');
    expect(content).toContain("aria-expanded={showGuide}");
    expect(content).toContain("Save Configuration");
  });

  it("verifies ActiveChannelSettings provides accessible tabpanel semantics", () => {
    const panelFile = path.join(settingsDir, "ActiveChannelSettings.tsx");
    const content = fs.readFileSync(panelFile, "utf-8");

    expect(content).toContain('role="tabpanel"');
    expect(content).toContain("id={`panel-${hub.activeTab}`}");
    expect(content).toContain("aria-labelledby={`tab-${hub.activeTab}`}");
  });
});
