# Cloudflare Turnstile — Official Reference

> **Official docs**: https://developers.cloudflare.com/turnstile/

---

## Key Docs Links

| Topic                  | URL                                                                             |
| ---------------------- | ------------------------------------------------------------------------------- |
| Getting Started        | https://developers.cloudflare.com/turnstile/get-started/                        |
| Client-Side Rendering  | https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/  |
| Server-Side Validation | https://developers.cloudflare.com/turnstile/get-started/server-side-validation/ |
| Widget Types           | https://developers.cloudflare.com/turnstile/concepts/widget-types/              |
| Testing (Dummy Keys)   | https://developers.cloudflare.com/turnstile/troubleshooting/testing/            |
| Dashboard              | https://dash.cloudflare.com/?to=/:account/turnstile                             |

---

## How Dilnova Uses Turnstile

- **Contact form** CAPTCHA protection
- Client-side widget renders the challenge
- Server-side validation of the token before processing the form

### Environment Variables

```env
NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x...
TURNSTILE_SECRET_KEY=0x...
```

### Server-Side Validation Pattern

```ts
async function validateTurnstile(token: string): Promise<boolean> {
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secret: process.env.TURNSTILE_SECRET_KEY,
      response: token,
    }),
  });
  const data = await response.json();
  return data.success;
}
```
