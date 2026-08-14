import { describe, it, expect } from "vitest";
import { parseRateLimitError } from "@/shared/security/rate-limit-parser";

describe("rate-limit-parser", () => {
  it("should return isRateLimit false for empty or standard error messages", () => {
    expect(parseRateLimitError(null)).toEqual({
      isRateLimit: false,
      retryAfterSeconds: 0,
      message: "",
    });

    expect(parseRateLimitError("Invalid credentials")).toEqual({
      isRateLimit: false,
      retryAfterSeconds: 0,
      message: "Invalid credentials",
    });
  });

  it("should correctly detect rate limit errors and extract seconds", () => {
    const res1 = parseRateLimitError("Rate limit exceeded. Please try again in 14 seconds.");
    expect(res1.isRateLimit).toBe(true);
    expect(res1.retryAfterSeconds).toBe(14);

    const res2 = parseRateLimitError("Too Many Requests: Edge Rate Limit Exceeded. Retry in 60s.");
    expect(res2.isRateLimit).toBe(true);
    expect(res2.retryAfterSeconds).toBe(60);

    const res3 = parseRateLimitError({
      serverError: "Rate limit exceeded. Please try again in 5 seconds.",
    });
    expect(res3.isRateLimit).toBe(true);
    expect(res3.retryAfterSeconds).toBe(5);
  });

  it("should fallback to default seconds if wait time is not numeric", () => {
    const res = parseRateLimitError("Rate limit exceeded");
    expect(res.isRateLimit).toBe(true);
    expect(res.retryAfterSeconds).toBe(15);
  });
});
