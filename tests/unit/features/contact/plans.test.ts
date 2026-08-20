import { describe, it, expect, vi } from "vitest";

// Mock server dependencies
vi.mock("server-only", () => ({}));
vi.mock("@/shared/db/client", () => ({
  db: {
    insert: vi.fn(),
  },
}));
vi.mock("@/features/contact/actions", () => ({
  submitContactFormAction: vi.fn(),
}));

// Mock client modules needed for importing ContactInteractiveForm
vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({ user: null, isSignedIn: false, isLoaded: true }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/contact",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

vi.mock("@/shared/hooks/use-auto-retry-action", () => ({
  useAutoRetryAction: () => ({
    execute: vi.fn(),
    isLoading: false,
    isRateLimited: false,
    countdownSeconds: 0,
  }),
}));

import {
  AVAILABLE_PLANS,
  type PlanTier,
} from "@/features/contact/components/ContactInteractiveForm";

describe("ContactInteractiveForm Plans Configuration", () => {
  it("defines standard enterprise tiers: starter, growth, enterprise", () => {
    const expectedTiers: PlanTier[] = ["starter", "growth", "enterprise"];
    expect(Object.keys(AVAILABLE_PLANS)).toEqual(expectedTiers);
  });

  it("maps starter tier to registration with $0/month", () => {
    const starter = AVAILABLE_PLANS.starter;
    expect(starter.name).toBe("Starter");
    expect(starter.price).toBe("$0");
    expect(starter.period).toBe("/month");
    expect(starter.category).toBe("registration");
  });

  it("maps growth tier to registration with $5/yearly and Popular badge", () => {
    const growth = AVAILABLE_PLANS.growth;
    expect(growth.name).toBe("Growth");
    expect(growth.price).toBe("$5");
    expect(growth.period).toBe("/yearly");
    expect(growth.badge).toBe("Popular");
    expect(growth.category).toBe("registration");
  });

  it("maps enterprise tier to collaboration with Custom pricing", () => {
    const enterprise = AVAILABLE_PLANS.enterprise;
    expect(enterprise.name).toBe("Enterprise");
    expect(enterprise.price).toBe("Custom");
    expect(enterprise.category).toBe("collaboration");
  });
});
