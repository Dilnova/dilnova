import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// Mock clerkMiddleware
vi.mock("@clerk/nextjs/server", () => ({
  clerkMiddleware: vi.fn((handler) => {
    return (req: unknown, event: unknown) => {
      const mockAuth = Object.assign(
        vi.fn().mockResolvedValue({
          userId: "user_test_mock",
          redirectToSignIn: vi
            .fn()
            .mockReturnValue(
              new Response(null, { status: 307, headers: { Location: "/sign-in" } }),
            ),
        }),
        {
          protect: vi.fn(),
        },
      );
      return handler(mockAuth, req, event);
    };
  }),
  createRouteMatcher: vi.fn((routes: string[]) => {
    return (req: { nextUrl?: { pathname?: string } }) => {
      return routes.some((r) => {
        const pattern = new RegExp("^" + r.replace(/\(\.\*\)/g, ".*"));
        return pattern.test(req?.nextUrl?.pathname || "");
      });
    };
  }),
}));

// Mock next/server to intercept responses
vi.mock("next/server", async (importOriginal) => {
  const original = await importOriginal<typeof import("next/server")>();
  class MockNextResponse {
    status: number;
    body: string;
    headers: Headers;
    constructor(body: string, init?: { status?: number; headers?: HeadersInit }) {
      this.body = body;
      this.status = init?.status ?? 200;
      this.headers = new Headers(init?.headers);
    }
    static next(init?: { request?: { headers?: Headers } }) {
      return { headers: init?.request?.headers || new Headers() };
    }
    static rewrite(destination: URL | string, init?: { request?: { headers?: Headers } }) {
      return { headers: init?.request?.headers || new Headers(), rewrittenUrl: destination };
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
  it("blocks requests with python-requests User-Agent and attaches security headers", async () => {
    const request = new NextRequest("http://localhost:3000/", {
      method: "GET",
      headers: {
        "user-agent": "python-requests/2.28.1",
      },
    });
    const result = (await proxy(request, mockEvent)) as unknown as {
      status: number;
      body: string;
      headers: Headers;
    };
    expect(result.status).toBe(403);
    expect(result.body).toContain("WAF Bot Protection");
    expect(result.headers.get("X-Frame-Options")).toBe("DENY");
    expect(result.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(result.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(result.headers.get("Permissions-Policy")).toContain("camera=()");
    expect(result.headers.get("Content-Security-Policy")).toBe(
      "default-src 'none'; frame-ancestors 'none';",
    );
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

  it("handles malformed percent sequences alongside valid payloads without throwing", async () => {
    const request = new NextRequest("http://localhost:3000/?q=%E0%A0%20UNION%20SELECT%20null", {
      method: "GET",
    });
    const result = (await proxy(request, mockEvent)) as unknown as MockResponse;
    expect(result).toBeInstanceOf(NextResponse);
    expect(result.status).toBe(403);
    expect(result.body).toContain("WAF SQLi Protection");
  });

  it("blocks requests with SQL inline comments obfuscation", async () => {
    const request = new NextRequest(
      "http://localhost:3000/?search=1%27/*foo*/UNION/*bar*/SELECT/*baz*/1",
      {
        method: "GET",
      },
    );
    const result = (await proxy(request, mockEvent)) as unknown as MockResponse;
    expect(result).toBeInstanceOf(NextResponse);
    expect(result.status).toBe(403);
    expect(result.body).toContain("WAF SQLi Protection");
  });

  it("blocks requests with triple-encoded Directory Traversal payloads", async () => {
    const request = new NextRequest(
      "http://localhost:3000/?file=%25252e%25252e%25252fetc%25252fpasswd",
      {
        method: "GET",
      },
    );
    const result = (await proxy(request, mockEvent)) as unknown as MockResponse;
    expect(result).toBeInstanceOf(NextResponse);
    expect(result.status).toBe(403);
    expect(result.body).toContain("WAF Directory Traversal Protection");
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

describe("Proxy Middleware Sensitive File & Directory Probe Protection", () => {
  it.each([
    ["/.env"],
    ["/.env.local"],
    ["/.env.production"],
    ["/.env.backup"],
    ["/.git"],
    ["/.git/config"],
    ["/.gitignore"],
    ["/.aws/credentials"],
    ["/.ssh/id_rsa"],
    ["/.vscode/settings.json"],
    ["/.ds_store"],
    ["/wp-admin"],
    ["/wp-login.php"],
    ["/xmlrpc.php"],
    ["/phpmyadmin"],
    ["/adminer.php"],
    ["/actuator/health"],
    ["/backup.sql"],
    ["/dump.tar.gz"],
    ["/script.php"],
  ])("blocks sensitive probe path %s with 404 and security headers", async (probePath) => {
    const request = new NextRequest(`http://localhost:3000${probePath}`, {
      method: "GET",
    });
    const result = (await proxy(request, mockEvent)) as unknown as {
      status: number;
      body: string;
      headers: Headers;
    };
    expect(result).toBeInstanceOf(NextResponse);
    expect(result.status).toBe(404);
    expect(result.body).toBe("Not Found");
    expect(result.headers.get("X-Frame-Options")).toBe("DENY");
    expect(result.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("blocks URL-encoded sensitive probe paths like /%2e%65%6e%76 with 404", async () => {
    const request = new NextRequest("http://localhost:3000/%2e%65%6e%76", {
      method: "GET",
    });
    const result = (await proxy(request, mockEvent)) as unknown as MockResponse;
    expect(result).toBeInstanceOf(NextResponse);
    expect(result.status).toBe(404);
  });

  it("allows standard RFC .well-known routes", async () => {
    const request = new NextRequest("http://localhost:3000/.well-known/security.txt", {
      method: "GET",
    });
    const result = await proxy(request, mockEvent);
    expect(result).not.toBeInstanceOf(NextResponse);
  });

  it("allows normal product and store pages", async () => {
    const request = new NextRequest("http://localhost:3000/products/motor-1", {
      method: "GET",
    });
    const result = await proxy(request, mockEvent);
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

describe("Proxy Multi-Domain Routing & Brand Rewrites", () => {
  it("rewrites root / to /brand/dilstar when host is dilstar.pp.ua", async () => {
    const request = new NextRequest("https://dilstar.pp.ua/", {
      method: "GET",
      headers: {
        host: "dilstar.pp.ua",
      },
    });
    const result = (await proxy(request, mockEvent)) as unknown as {
      rewrittenUrl?: URL;
      headers: Headers;
    };
    expect(result.rewrittenUrl).toBeDefined();
    expect(result.rewrittenUrl?.pathname).toBe("/brand/dilstar");
  });

  it("rewrites /hardware to /vendors/distar-hardware when host is dilstar.pp.ua", async () => {
    const request = new NextRequest("https://dilstar.pp.ua/hardware", {
      method: "GET",
      headers: {
        host: "dilstar.pp.ua",
      },
    });
    const result = (await proxy(request, mockEvent)) as unknown as {
      rewrittenUrl?: URL;
      headers: Headers;
    };
    expect(result.rewrittenUrl).toBeDefined();
    expect(result.rewrittenUrl?.pathname).toBe("/vendors/distar-hardware");
  });

  it("rewrites /tech to /vendors/distar-tech when host is dilstar.pp.ua", async () => {
    const request = new NextRequest("https://dilstar.pp.ua/tech", {
      method: "GET",
      headers: {
        host: "dilstar.pp.ua",
      },
    });
    const result = (await proxy(request, mockEvent)) as unknown as {
      rewrittenUrl?: URL;
      headers: Headers;
    };
    expect(result.rewrittenUrl).toBeDefined();
    expect(result.rewrittenUrl?.pathname).toBe("/vendors/distar-tech");
  });

  it("rewrites /nursery to /vendors/distar-nursery when host is dilstar.pp.ua", async () => {
    const request = new NextRequest("https://dilstar.pp.ua/nursery", {
      method: "GET",
      headers: {
        host: "dilstar.pp.ua",
      },
    });
    const result = (await proxy(request, mockEvent)) as unknown as {
      rewrittenUrl?: URL;
      headers: Headers;
    };
    expect(result.rewrittenUrl).toBeDefined();
    expect(result.rewrittenUrl?.pathname).toBe("/vendors/distar-nursery");
  });

  it("rewrites /services to /vendors/dilstar-services when host is dilstar.pp.ua", async () => {
    const request = new NextRequest("https://dilstar.pp.ua/services", {
      method: "GET",
      headers: {
        host: "dilstar.pp.ua",
      },
    });
    const result = (await proxy(request, mockEvent)) as unknown as {
      rewrittenUrl?: URL;
      headers: Headers;
    };
    expect(result.rewrittenUrl).toBeDefined();
    expect(result.rewrittenUrl?.pathname).toBe("/vendors/dilstar-services");
  });

  it("does not rewrite when host is dilnova.pp.ua", async () => {
    const request = new NextRequest("https://dilnova.pp.ua/", {
      method: "GET",
      headers: {
        host: "dilnova.pp.ua",
      },
    });
    const result = (await proxy(request, mockEvent)) as unknown as {
      rewrittenUrl?: URL;
      headers: Headers;
    };
    expect(result.rewrittenUrl).toBeUndefined();
  });

  it("includes both dilstar and dilnova Clerk domains in CSP header", async () => {
    const request = new NextRequest("https://dilnova.pp.ua/", {
      method: "GET",
      headers: {
        host: "dilnova.pp.ua",
      },
    });
    const result = (await proxy(request, mockEvent)) as unknown as {
      headers: Headers;
    };
    const csp = result.headers.get("Content-Security-Policy") || "";
    expect(csp).toContain("https://clerk.dilstar.pp.ua");
    expect(csp).toContain("https://clerk.dilnova.pp.ua");
  });
});
