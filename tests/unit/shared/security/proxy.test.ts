import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// Mock clerkMiddleware
vi.mock("@clerk/nextjs/server", () => ({
  clerkMiddleware: vi.fn((handler) => {
    return (req: unknown, event: unknown) => {
      const mockAuth = {};
      return handler(mockAuth, req, event);
    };
  }),
}));

// Mock next/server to intercept responses
vi.mock("next/server", async (importOriginal) => {
  const original = await importOriginal<typeof import("next/server")>();
  class MockNextResponse {
    status: number;
    body: string;
    constructor(body: string, init?: { status?: number }) {
      this.body = body;
      this.status = init?.status ?? 200;
    }
    static next() {
      return { headers: { set: () => {} } };
    }
  }
  return {
    ...original,
    NextResponse: MockNextResponse,
  };
});

const mockLimit = vi.fn().mockResolvedValue({ success: true, reset: Date.now() + 60000 });

// Mock Upstash Redis and Ratelimit
vi.mock("@upstash/redis", () => ({
  Redis: class {
    constructor() {}
  },
}));

vi.mock("@upstash/ratelimit", () => {
  class Ratelimit {
    limit = mockLimit;
    static slidingWindow = vi.fn().mockReturnValue({});
  }
  return {
    Ratelimit,
  };
});

import proxy from "@/proxy";

const mockEvent = {} as unknown as import("next/server").NextFetchEvent;

type MockResponse = { status: number; body: string };

describe("Proxy Middleware CSRF Protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows GET requests without CSRF check", async () => {
    const request = new NextRequest("http://localhost:3000/api/health", {
      method: "GET",
    });
    const result = await proxy(request, mockEvent);
    expect(result).not.toBeInstanceOf(NextResponse);
  });

  it("rejects POST requests without next-action header when origin/host are missing", async () => {
    const request = new NextRequest("http://localhost:3000/api/some-custom-post", {
      method: "POST",
    });
    const result = (await proxy(request, mockEvent)) as unknown as MockResponse;
    expect(result).toBeInstanceOf(NextResponse);
    expect(result.status).toBe(403);
    expect(result.body).toContain("Missing Origin or Host header");
  });

  it("allows POST requests to webhooks without CSRF check", async () => {
    const request = new NextRequest("http://localhost:3000/api/webhooks/clerk", {
      method: "POST",
    });
    const result = await proxy(request, mockEvent);
    expect(result).not.toBeInstanceOf(NextResponse);
  });

  it("allows POST requests to csp-report without CSRF check", async () => {
    const request = new NextRequest("http://localhost:3000/api/csp-report", {
      method: "POST",
    });
    const result = await proxy(request, mockEvent);
    expect(result).not.toBeInstanceOf(NextResponse);
  });

  it("rejects POST requests with next-action header but missing origin", async () => {
    const request = new NextRequest("http://localhost:3000/some-action", {
      method: "POST",
      headers: {
        "next-action": "action-id",
      },
    });
    const result = (await proxy(request, mockEvent)) as unknown as MockResponse;
    expect(result).toBeInstanceOf(NextResponse);
    expect(result.status).toBe(403);
    expect(result.body).toContain("Missing Origin or Host header");
  });

  it("rejects POST requests with mismatched origin and host", async () => {
    const request = new NextRequest("http://localhost:3000/some-action", {
      method: "POST",
      headers: {
        "next-action": "action-id",
        origin: "https://malicious.com",
        host: "localhost:3000",
      },
    });
    const result = (await proxy(request, mockEvent)) as unknown as MockResponse;
    expect(result).toBeInstanceOf(NextResponse);
    expect(result.status).toBe(403);
    expect(result.body).toContain("Mismatched Origin and Host");
  });

  it("allows POST requests with matching origin and host", async () => {
    const request = new NextRequest("http://localhost:3000/some-action", {
      method: "POST",
      headers: {
        "next-action": "action-id",
        origin: "http://localhost:3000",
        host: "localhost:3000",
      },
    });
    const result = await proxy(request, mockEvent);
    expect(result).not.toBeInstanceOf(NextResponse);
  });

  it("allows POST requests with matching origin and x-forwarded-host", async () => {
    const request = new NextRequest("http://localhost:3000/some-action", {
      method: "POST",
      headers: {
        "next-action": "action-id",
        origin: "https://dilstar.pp.ua",
        host: "internal-load-balancer",
        "x-forwarded-host": "dilstar.pp.ua",
      },
    });
    const result = await proxy(request, mockEvent);
    expect(result).not.toBeInstanceOf(NextResponse);
  });
});

describe("Proxy Middleware WAF Protection", () => {
  it("blocks requests with python-requests User-Agent", async () => {
    const request = new NextRequest("http://localhost:3000/", {
      method: "GET",
      headers: {
        "user-agent": "python-requests/2.28.1",
      },
    });
    const result = (await proxy(request, mockEvent)) as unknown as MockResponse;
    expect(result).toBeInstanceOf(NextResponse);
    expect(result.status).toBe(403);
    expect(result.body).toContain("WAF Bot Protection");
  });

  it("blocks requests with SQL injection payloads", async () => {
    const request = new NextRequest(
      "http://localhost:3000/?search=%27%20UNION%20SELECT%20null%20--",
      {
        method: "GET",
      },
    );
    const result = (await proxy(request, mockEvent)) as unknown as MockResponse;
    expect(result).toBeInstanceOf(NextResponse);
    expect(result.status).toBe(403);
    expect(result.body).toContain("WAF SQLi Protection");
  });

  it("blocks requests with plus-encoded SQL injection payloads", async () => {
    const request = new NextRequest("http://localhost:3000/?search=%27+UNION+SELECT+null+--", {
      method: "GET",
    });
    const result = (await proxy(request, mockEvent)) as unknown as MockResponse;
    expect(result).toBeInstanceOf(NextResponse);
    expect(result.status).toBe(403);
    expect(result.body).toContain("WAF SQLi Protection");
  });

  it("blocks requests with stored procedure execution payloads", async () => {
    const request = new NextRequest("http://localhost:3000/?q=exec+xp_cmdshell", {
      method: "GET",
    });
    const result = (await proxy(request, mockEvent)) as unknown as MockResponse;
    expect(result).toBeInstanceOf(NextResponse);
    expect(result.status).toBe(403);
    expect(result.body).toContain("WAF SQLi Protection");
  });

  it("blocks requests with Directory Traversal payloads", async () => {
    const request = new NextRequest("http://localhost:3000/?file=../../../../etc/passwd", {
      method: "GET",
    });
    const result = (await proxy(request, mockEvent)) as unknown as MockResponse;
    expect(result).toBeInstanceOf(NextResponse);
    expect(result.status).toBe(403);
    expect(result.body).toContain("WAF Directory Traversal Protection");
  });

  it("blocks requests with double-encoded Directory Traversal payloads", async () => {
    const request = new NextRequest(
      "http://localhost:3000/?file=%252e%252e%252f%252e%252e%252fetc%252fpasswd",
      {
        method: "GET",
      },
    );
    const result = (await proxy(request, mockEvent)) as unknown as MockResponse;
    expect(result).toBeInstanceOf(NextResponse);
    expect(result.status).toBe(403);
    expect(result.body).toContain("WAF Directory Traversal Protection");
  });

  it("blocks requests with XSS payloads", async () => {
    const request = new NextRequest("http://localhost:3000/?q=%3Cscript%3Ealert(1)%3C/script%3E", {
      method: "GET",
    });
    const result = (await proxy(request, mockEvent)) as unknown as MockResponse;
    expect(result).toBeInstanceOf(NextResponse);
    expect(result.status).toBe(403);
    expect(result.body).toContain("WAF XSS Protection");
  });

  it("blocks requests with Command Injection payloads", async () => {
    const request = new NextRequest("http://localhost:3000/?cmd=%3B+cat+/var/log/syslog", {
      method: "GET",
    });
    const result = (await proxy(request, mockEvent)) as unknown as MockResponse;
    expect(result).toBeInstanceOf(NextResponse);
    expect(result.status).toBe(403);
    expect(result.body).toContain("WAF Command Injection Protection");
  });

  it("handles adversarial ReDoS inputs in linear time without catastrophic backtracking", async () => {
    const adversarialQuery = "exec" + " ".repeat(20000) + "+".repeat(20000);
    const request = new NextRequest(
      `http://localhost:3000/?q=${encodeURIComponent(adversarialQuery)}`,
      {
        method: "GET",
      },
    );

    const start = performance.now();
    const result = await proxy(request, mockEvent);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(100);
    expect(result).not.toBeInstanceOf(NextResponse);
  });
});

describe("Proxy Middleware Edge Rate Limiting Protection", () => {
  const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
  const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  beforeEach(() => {
    mockLimit.mockResolvedValue({ success: true, reset: Date.now() + 60000 });
  });

  afterAll(() => {
    if (originalUrl) process.env.UPSTASH_REDIS_REST_URL = originalUrl;
    else delete process.env.UPSTASH_REDIS_REST_URL;
    if (originalToken) process.env.UPSTASH_REDIS_REST_TOKEN = originalToken;
    else delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it("allows normal requests gracefully when Upstash is not configured", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const request = new NextRequest("http://localhost:3000/api/some-endpoint", {
      method: "GET",
    });
    const result = await proxy(request, mockEvent);
    expect(result).not.toBeInstanceOf(NextResponse);
  });

  it("blocks requests with 429 status when Upstash rate limit is exceeded", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://demo.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "mock-token";
    mockLimit.mockResolvedValue({ success: false, reset: Date.now() + 30000 });

    const request = new NextRequest("http://localhost:3000/api/some-endpoint", {
      method: "GET",
    });
    const result = (await proxy(request, mockEvent)) as unknown as MockResponse;
    expect(result).toBeInstanceOf(NextResponse);
    expect(result.status).toBe(429);
    expect(result.body).toContain("Edge Rate Limit Exceeded");
  });

  it("fails open gracefully when Upstash rate limit call throws an error", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://demo.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "mock-token";
    mockLimit.mockRejectedValue(new Error("Connection error"));

    const request = new NextRequest("http://localhost:3000/api/some-endpoint", {
      method: "GET",
    });
    const result = await proxy(request, mockEvent);
    expect(result).not.toBeInstanceOf(NextResponse);
  });
});
