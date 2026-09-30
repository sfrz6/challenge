# Insurance artifact for moving off Vercel to any Docker-capable host.
# Vercel builds this app natively and does not use this file.

FROM node:22-alpine AS base

# ---- deps: install with dev deps so `prisma generate` (postinstall) can run ----
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
# npm install rather than `npm ci`: some optional platform-native deps in
# this lockfile don't round-trip cleanly across host OSes (a known npm
# quirk with per-platform optional deps), so `ci`'s strict lockfile check
# can false-positive here even though the lockfile is otherwise valid.
RUN npm install --no-audit --no-fund

# ---- build ----
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- run ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
