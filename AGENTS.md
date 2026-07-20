<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

**IMPORTANT NOTE (Next.js 16+)**: Starting in Next.js 16, the `middleware.ts` file convention has been officially deprecated and replaced by the new `proxy.ts` convention. The core functionality remains highly similar, but it was renamed to clarify its actual architectural purpose as a routing and network boundary layer rather than a place to chain heavy business logic. DO NOT use `middleware.ts`, use `proxy.ts` instead.
<!-- END:nextjs-agent-rules -->
