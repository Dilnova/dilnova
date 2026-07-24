import { describe, expect, it } from "vitest";
import {
  isValidUpstashRestUrl,
  isValidUpstashRestToken,
  readUpstashEnv,
} from "@/shared/security/upstash-health";

describe("upstashHealth", () => {
  it("validates Upstash REST URLs", () => {
    expect(isValidUpstashRestUrl("https://us1-example.upstash.io")).toBe(true);
    expect(isValidUpstashRestUrl("rediss://default:token@host:6379")).toBe(false);
    expect(isValidUpstashRestUrl("https://evil.example.com")).toBe(false);
  });

  it("rejects dummy or placeholder Upstash REST URLs", () => {
    expect(isValidUpstashRestUrl("https://dummy.upstash.io")).toBe(false);
    expect(isValidUpstashRestUrl("https://placeholder.upstash.io")).toBe(false);
    expect(isValidUpstashRestUrl("https://your-upstash-url.upstash.io")).toBe(false);
  });

  it("validates Upstash REST tokens", () => {
    expect(isValidUpstashRestToken("real-token-12345")).toBe(true);
    expect(isValidUpstashRestToken("dummy-token")).toBe(false);
    expect(isValidUpstashRestToken("placeholder")).toBe(false);
    expect(isValidUpstashRestToken("your_upstash_token")).toBe(false);
  });

  it("strips wrapping quotes from env values", () => {
    process.env.UPSTASH_REDIS_REST_URL = '"https://demo.upstash.io"';
    process.env.UPSTASH_REDIS_REST_TOKEN = "'token-value'";

    expect(readUpstashEnv()).toEqual({
      url: "https://demo.upstash.io",
      token: "token-value",
    });

    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });
});
