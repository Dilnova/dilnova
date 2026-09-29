import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  acquireIdempotencyLock,
  completeIdempotency,
  releaseIdempotencyLock,
  generateRequestFingerprint,
  checkIdempotencyKey,
} from "@/shared/security/idempotency";
import * as upstashHealth from "@/shared/security/upstash-health";

const mockGet = vi.fn();
const mockSet = vi.fn();
const mockDel = vi.fn();

vi.mock("@upstash/redis", () => ({
  Redis: class {
    get = mockGet;
    set = mockSet;
    del = mockDel;
  },
}));

describe("Idempotency Engine (shared/security/idempotency.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default to in-memory mode
    vi.spyOn(upstashHealth, "readUpstashEnv").mockReturnValue({ url: null, token: null });
  });

  describe("generateRequestFingerprint", () => {
    it("generates a deterministic 64-character SHA-256 hex string", () => {
      const payload = { amount: 5000, items: ["item-1"] };
      const hash1 = generateRequestFingerprint("user_123", payload);
      const hash2 = generateRequestFingerprint("user_123", payload);

      expect(hash1).toHaveLength(64);
      expect(hash1).toBe(hash2);
    });

    it("generates different fingerprints for different users or payloads", () => {
      const payload = { amount: 5000 };
      const hash1 = generateRequestFingerprint("user_1", payload);
      const hash2 = generateRequestFingerprint("user_2", payload);
      const hash3 = generateRequestFingerprint("user_1", { amount: 6000 });

      expect(hash1).not.toBe(hash2);
      expect(hash1).not.toBe(hash3);
    });
  });

  describe("In-Memory Store Fallback", () => {
    it("acquires lock on first call and blocks second call while processing", async () => {
      const key = "mem-test-key-1";

      const first = await acquireIdempotencyLock(key, 60);
      expect(first.isAcquired).toBe(true);

      const second = await acquireIdempotencyLock(key, 60);
      expect(second.isAcquired).toBe(false);
      expect(second.existingRecord?.status).toBe("processing");
    });

    it("returns cached completed result after completeIdempotency", async () => {
      const key = "mem-test-key-2";
      const resultData = { orderId: "ord_123", grandTotal: 5000 };

      const first = await acquireIdempotencyLock(key, 60);
      expect(first.isAcquired).toBe(true);

      await completeIdempotency(key, resultData, 3600);

      const second = await acquireIdempotencyLock(key, 60);
      expect(second.isAcquired).toBe(false);
      expect(second.existingRecord?.status).toBe("completed");
      expect(second.existingRecord?.data).toEqual(resultData);
    });

    it("releases lock so subsequent attempt can acquire it", async () => {
      const key = "mem-test-key-3";

      const first = await acquireIdempotencyLock(key, 60);
      expect(first.isAcquired).toBe(true);

      await releaseIdempotencyLock(key);

      const retry = await acquireIdempotencyLock(key, 60);
      expect(retry.isAcquired).toBe(true);
    });

    it("checkIdempotencyKey wrapper works correctly", async () => {
      const key = "mem-test-key-4";

      const first = await checkIdempotencyKey(key, 60);
      expect(first).toBe(true);

      const second = await checkIdempotencyKey(key, 60);
      expect(second).toBe(false);
    });
  });

  describe("Upstash Redis Integration", () => {
    beforeEach(() => {
      vi.spyOn(upstashHealth, "readUpstashEnv").mockReturnValue({
        url: "https://redis.upstash.com",
        token: "fake-token",
      });
    });

    it("acquires lock via Redis SET NX EX when key does not exist", async () => {
      mockGet.mockResolvedValueOnce(null);
      mockSet.mockResolvedValueOnce("OK");

      const result = await acquireIdempotencyLock("redis-key-1", 60);

      expect(result.isAcquired).toBe(true);
      expect(mockSet).toHaveBeenCalledWith(
        "idempotency:redis-key-1",
        expect.stringContaining('"status":"processing"'),
        { nx: true, ex: 60 },
      );
    });

    it("returns existing record if key is already present in Redis", async () => {
      const existing = { status: "completed", data: { orderId: "ord_999" }, createdAt: 12345 };
      mockGet.mockResolvedValueOnce(JSON.stringify(existing));

      const result = await acquireIdempotencyLock("redis-key-2", 60);

      expect(result.isAcquired).toBe(false);
      expect(result.existingRecord).toEqual(existing);
      expect(mockSet).not.toHaveBeenCalled();
    });

    it("handles race condition when SET NX returns null (another process acquired it)", async () => {
      mockGet.mockResolvedValueOnce(null); // Initial check: key not found
      mockSet.mockResolvedValueOnce(null); // SET NX failed due to concurrent acquire
      const concurrentRecord = { status: "processing", createdAt: 12345 };
      mockGet.mockResolvedValueOnce(JSON.stringify(concurrentRecord)); // Fetch latest

      const result = await acquireIdempotencyLock("redis-key-3", 60);

      expect(result.isAcquired).toBe(false);
      expect(result.existingRecord).toEqual(concurrentRecord);
    });

    it("completes idempotency by setting key with 24h expiration in Redis", async () => {
      const data = { orderId: "ord_completed" };
      await completeIdempotency("redis-key-4", data, 86400);

      expect(mockSet).toHaveBeenCalledWith(
        "idempotency:redis-key-4",
        expect.stringContaining('"status":"completed"'),
        { ex: 86400 },
      );
    });

    it("releases lock by calling DEL in Redis", async () => {
      await releaseIdempotencyLock("redis-key-5");

      expect(mockDel).toHaveBeenCalledWith("idempotency:redis-key-5");
    });

    it("falls back to in-memory store if Redis throws", async () => {
      mockGet.mockRejectedValueOnce(new Error("Redis connection refused"));

      const result = await acquireIdempotencyLock("redis-fallback-key", 60);

      // Memory fallback handles it and acquires lock
      expect(result.isAcquired).toBe(true);
    });
  });
});
