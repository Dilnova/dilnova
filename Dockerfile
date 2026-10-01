# ═══════════════════════════════════════════════════════════════
# DILNOVA COMMERCE HUB — PRODUCTION MULTI-STAGE DOCKERFILE
# ═══════════════════════════════════════════════════════════════

# Stage 1: Base Node.js image with pnpm enabled
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Stage 2: Install production dependencies
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Stage 3: Build Next.js application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time arguments (can be overridden via --build-arg)
ARG NEXT_PUBLIC_APP_URL="http://localhost:3000"
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_placeholder"
ARG NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="placeholder"
ARG NEXT_PUBLIC_SUPABASE_URL="https://placeholder.supabase.co"
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="placeholder"
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY="1x00000000000000000000AA"
ARG NEXT_PUBLIC_SENTRY_DSN=""
ARG NEXT_PUBLIC_APP_NAME="Dilnova"
ARG CLERK_SECRET_KEY="sk_test_placeholder"
ARG DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/postgres"

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=$NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
ENV CLERK_SECRET_KEY=$CLERK_SECRET_KEY
ENV DATABASE_URL=$DATABASE_URL

RUN pnpm run build

# Stage 4: Production Unprivileged Runner
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy public static files and Next.js standalone build
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
