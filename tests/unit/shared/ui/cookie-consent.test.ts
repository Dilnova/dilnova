import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import CookieConsent from "@/shared/ui/CookieConsent";

describe("CookieConsent component (Finding 20.2)", () => {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;

  beforeEach(() => {
    globalThis.document = {
      cookie: "",
    } as unknown as Document;

    globalThis.window = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as Window & typeof globalThis;
  });

  afterEach(() => {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
    vi.restoreAllMocks();
  });

  it("renders null on initial server render (visibility managed dynamically)", () => {
    const html = renderToStaticMarkup(React.createElement(CookieConsent, {}));
    expect(html).toBe("");
  });

  it("renders null on server render when initialConsent is already accepted", () => {
    const html = renderToStaticMarkup(
      React.createElement(CookieConsent, { initialConsent: "accepted" }),
    );
    expect(html).toBe("");
  });

  it("renders null on server render when initialConsent is already declined", () => {
    const html = renderToStaticMarkup(
      React.createElement(CookieConsent, { initialConsent: "declined" }),
    );
    expect(html).toBe("");
  });
});
