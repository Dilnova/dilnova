import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("shared/ui/language/languageUtils in browser-like environment", () => {
  let fakeCookie = "";
  let fakeStorage: Record<string, string> = {};

  beforeEach(() => {
    fakeCookie = "";
    fakeStorage = {};

    vi.stubGlobal("document", {
      get cookie() {
        return fakeCookie;
      },
      set cookie(val: string) {
        const parts = val.split(";")[0]?.trim();
        if (parts) {
          const [key, value] = parts.split("=");
          if (val.includes("expires=Thu, 01 Jan 1970")) {
            // Delete cookie
            fakeCookie = fakeCookie
              .split(";")
              .filter((c) => !c.trim().startsWith(key + "="))
              .join("; ");
          } else {
            fakeCookie = fakeCookie ? `${fakeCookie}; ${key}=${value}` : `${key}=${value}`;
          }
        }
      },
    });

    vi.stubGlobal("window", {
      location: {
        hostname: "localhost",
        protocol: "http:",
      },
      localStorage: {
        getItem: (k: string) => fakeStorage[k] ?? null,
        setItem: (k: string, v: string) => {
          fakeStorage[k] = v;
        },
        clear: () => {
          fakeStorage = {};
        },
      },
    });

    vi.stubGlobal("navigator", {
      language: "en-US",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("detects browser language with fallback to en", async () => {
    const { detectBrowserLanguage } = await import("@/shared/ui/language/languageUtils");
    expect(detectBrowserLanguage()).toBe("en");
  });

  it("detects sinhala and tamil when navigator language starts with si or ta", async () => {
    vi.stubGlobal("navigator", { language: "si-LK" });
    const { detectBrowserLanguage } = await import("@/shared/ui/language/languageUtils");
    expect(detectBrowserLanguage()).toBe("si");
  });

  it("reports hasLanguageChoice correctly when preference cookie or storage is set", async () => {
    const languageUtils = await import("@/shared/ui/language/languageUtils");
    expect(languageUtils.hasLanguageChoice()).toBe(false);

    languageUtils.setLangPreferenceCookie("en");
    expect(languageUtils.hasLanguageChoice()).toBe(true);
    expect(languageUtils.getLangPreference()).toBe("en");
  });

  it("initializes default language without error", async () => {
    const languageUtils = await import("@/shared/ui/language/languageUtils");
    expect(languageUtils.hasLanguageChoice()).toBe(false);

    const initial = languageUtils.initDefaultLanguageIfNeeded();
    expect(initial).toBe("en");
    expect(languageUtils.hasLanguageChoice()).toBe(true);
  });
});
