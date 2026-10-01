import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ConsentTracking from "@/shared/ui/ConsentTracking";
import CookiePreferencesButton from "@/shared/ui/CookiePreferencesButton";
import { OPEN_COOKIE_PREFERENCES_EVENT } from "@/shared/cookies/consent";

vi.mock("@vercel/analytics/next", () => ({
  Analytics: () => React.createElement("div", { "data-testid": "vercel-analytics" }),
}));

vi.mock("@vercel/speed-insights/next", () => ({
  SpeedInsights: () => React.createElement("div", { "data-testid": "vercel-speed-insights" }),
}));

describe("ConsentTracking & CookiePreferencesButton (Finding 20.2)", () => {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  let eventListeners: Record<string, ((event: Event) => void)[]>;

  beforeEach(() => {
    eventListeners = {};

    globalThis.document = {
      cookie: "",
    } as unknown as Document;

    globalThis.window = {
      addEventListener: vi.fn((event: string, handler: (e: Event) => void) => {
        if (!eventListeners[event]) eventListeners[event] = [];
        eventListeners[event].push(handler);
      }),
      removeEventListener: vi.fn((event: string, handler: (e: Event) => void) => {
        if (eventListeners[event]) {
          eventListeners[event] = eventListeners[event].filter((h) => h !== handler);
        }
      }),
      dispatchEvent: vi.fn((event: Event) => {
        if (eventListeners[event.type]) {
          eventListeners[event.type].forEach((handler) => handler(event));
        }
        return true;
      }),
    } as unknown as Window & typeof globalThis;
  });

  afterEach(() => {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
    vi.restoreAllMocks();
  });

  describe("ConsentTracking component behavior", () => {
    it("renders nothing (empty string) when initialConsent is false or absent", () => {
      const htmlFalse = renderToStaticMarkup(
        React.createElement(ConsentTracking, { initialConsent: false }),
      );
      expect(htmlFalse).toBe("");

      const htmlUndefined = renderToStaticMarkup(React.createElement(ConsentTracking, {}));
      expect(htmlUndefined).toBe("");
    });

    it("renders Analytics and SpeedInsights when initialConsent is true", () => {
      const html = renderToStaticMarkup(
        React.createElement(ConsentTracking, { initialConsent: true }),
      );
      expect(html).toContain('data-testid="vercel-analytics"');
      expect(html).toContain('data-testid="vercel-speed-insights"');
    });
  });

  describe("CookiePreferencesButton behavior", () => {
    it("dispatches OPEN_COOKIE_PREFERENCES_EVENT when clicked (button variant)", () => {
      const element = CookiePreferencesButton({ variant: "button" });
      expect(element.type).toBe("button");

      // Simulate onClick handler
      element.props.onClick();

      expect(globalThis.window.dispatchEvent).toHaveBeenCalledTimes(1);
      const dispatchedEvent = (
        globalThis.window.dispatchEvent as unknown as ReturnType<typeof vi.fn>
      ).mock.calls[0][0] as Event;
      expect(dispatchedEvent.type).toBe(OPEN_COOKIE_PREFERENCES_EVENT);
    });

    it("dispatches OPEN_COOKIE_PREFERENCES_EVENT when clicked (link variant)", () => {
      const element = CookiePreferencesButton({ variant: "link" });
      expect(element.type).toBe("button");

      element.props.onClick();

      expect(globalThis.window.dispatchEvent).toHaveBeenCalledTimes(1);
      const dispatchedEvent = (
        globalThis.window.dispatchEvent as unknown as ReturnType<typeof vi.fn>
      ).mock.calls[0][0] as Event;
      expect(dispatchedEvent.type).toBe(OPEN_COOKIE_PREFERENCES_EVENT);
    });

    it("renders expected markup for button variant", () => {
      const html = renderToStaticMarkup(
        React.createElement(CookiePreferencesButton, { variant: "button" }),
      );
      expect(html).toContain("<button");
      expect(html).toContain("Manage Cookie Preferences");
    });

    it("renders expected markup for link variant", () => {
      const html = renderToStaticMarkup(
        React.createElement(CookiePreferencesButton, { variant: "link" }),
      );
      expect(html).toContain("<button");
      expect(html).toContain("Cookie Settings");
    });
  });
});
