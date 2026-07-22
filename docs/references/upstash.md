# Upstash (Redis + Rate Limiting) — Official Reference

> **Versions in use**: `@upstash/redis ^1.38.0`, `@upstash/ratelimit ^2.0.8`
> **Official docs**: https://upstash.com/docs

---

## Key Docs Links

| Topic                    | URL                                                                        |
| ------------------------ | -------------------------------------------------------------------------- |
| Redis Getting Started    | https://upstash.com/docs/redis/overall/getstarted                          |
| Redis SDK (TypeScript)   | https://upstash.com/docs/redis/sdks/ts/overview                            |
| Rate Limiting Overview   | https://upstash.com/docs/redis/sdks/ratelimit-ts/overview                  |
| Rate Limiting Algorithms | https://upstash.com/docs/redis/sdks/ratelimit-ts/algorithms                |
| Sliding Window           | https://upstash.com/docs/redis/sdks/ratelimit-ts/algorithms#sliding-window |
| Fixed Window             | https://upstash.com/docs/redis/sdks/ratelimit-ts/algorithms#fixed-window   |
| REST API                 | https://upstash.com/docs/redis/features/restapi                            |
| Dashboard                | https://console.upstash.com                                                |

---

## How Dilnova Uses Upstash

### Rate Limiting

- **Contact form**: 2 requests/min per IP
- **Checkout**: 5 requests/min per IP
- Implementation in `shared/security/rate-limit.ts`

### Common Pattern

```ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(2, "1 m"), // 2 requests per minute
  analytics: true,
});

// Usage in server action
const { success, limit, remaining } = await ratelimit.limit(identifier);
if (!success) {
  throw new Error("Rate limit exceeded");
}
```

### Environment Variables

```env
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=AX...
```
