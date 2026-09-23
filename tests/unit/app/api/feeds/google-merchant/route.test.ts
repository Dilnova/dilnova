import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/feeds/google-merchant/route";
import { NextRequest } from "next/server";

vi.mock("@/features/google-merchant/services/feed-generator", () => ({
  generateGoogleMerchantFeed: vi
    .fn()
    .mockResolvedValue("<rss><channel><title>Test Feed</title></channel></rss>"),
}));

let mockIntegrationRows: Record<string, unknown>[] = [];

vi.mock("@/shared/db/client", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve(mockIntegrationRows)),
        })),
      })),
    })),
  },
}));

vi.mock("@/shared/logging/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("GET /api/feeds/google-merchant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIntegrationRows = [];
  });

  it("returns 403 if orgId is provided but no integration record exists", async () => {
    mockIntegrationRows = [];
    const req = new NextRequest(
      "http://localhost:3000/api/feeds/google-merchant?orgId=org_unknown",
    );
    const res = await GET(req);

    expect(res.status).toBe(403);
    const text = await res.text();
    expect(text).toContain("Google Shopping feed is not configured for this organization");
  });

  it("returns 403 if integration is disabled or autoSyncGoogle is false", async () => {
    mockIntegrationRows = [
      {
        googleFeedToken: "valid_secret_token_123",
        isEnabled: false,
        autoSyncGoogle: true,
      },
    ];
    const req = new NextRequest(
      "http://localhost:3000/api/feeds/google-merchant?orgId=org_123&token=valid_secret_token_123",
    );
    const res = await GET(req);

    expect(res.status).toBe(403);
    const text = await res.text();
    expect(text).toContain("Google Shopping feed is currently disabled for this organization");
  });

  it("returns 401 if integration exists but googleFeedToken is not configured", async () => {
    mockIntegrationRows = [
      {
        googleFeedToken: null,
        isEnabled: true,
        autoSyncGoogle: true,
      },
    ];
    const req = new NextRequest("http://localhost:3000/api/feeds/google-merchant?orgId=org_123");
    const res = await GET(req);

    expect(res.status).toBe(401);
    const text = await res.text();
    expect(text).toContain("Google Feed token not configured for this organization");
  });

  it("returns 401 if token is missing when requesting org feed", async () => {
    mockIntegrationRows = [
      {
        googleFeedToken: "valid_secret_token_123",
        isEnabled: true,
        autoSyncGoogle: true,
      },
    ];
    const req = new NextRequest("http://localhost:3000/api/feeds/google-merchant?orgId=org_123");
    const res = await GET(req);

    expect(res.status).toBe(401);
    const text = await res.text();
    expect(text).toContain("Unauthorized: Invalid Google Feed token");
  });

  it("returns 401 if token is incorrect", async () => {
    mockIntegrationRows = [
      {
        googleFeedToken: "valid_secret_token_123",
        isEnabled: true,
        autoSyncGoogle: true,
      },
    ];
    const req = new NextRequest(
      "http://localhost:3000/api/feeds/google-merchant?orgId=org_123&token=wrong_token",
    );
    const res = await GET(req);

    expect(res.status).toBe(401);
    const text = await res.text();
    expect(text).toContain("Unauthorized: Invalid Google Feed token");
  });

  it("succeeds with 200 when valid token is supplied via query param", async () => {
    mockIntegrationRows = [
      {
        googleFeedToken: "valid_secret_token_123",
        isEnabled: true,
        autoSyncGoogle: true,
      },
    ];
    const req = new NextRequest(
      "http://localhost:3000/api/feeds/google-merchant?orgId=org_123&token=valid_secret_token_123",
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("<rss><channel><title>Test Feed</title></channel></rss>");
    expect(res.headers.get("Content-Type")).toContain("application/xml");
  });

  it("succeeds with 200 when valid token is supplied via Authorization Bearer header", async () => {
    mockIntegrationRows = [
      {
        googleFeedToken: "valid_secret_token_123",
        isEnabled: true,
        autoSyncGoogle: true,
      },
    ];
    const req = new NextRequest("http://localhost:3000/api/feeds/google-merchant?orgId=org_123", {
      headers: {
        Authorization: "Bearer valid_secret_token_123",
      },
    });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("<rss><channel><title>Test Feed</title></channel></rss>");
  });
});
