# Spot the Vuln

Booth challenge app for the AppSec team's October event. Visitors work through
10 code snippets, identify the vulnerable line (or correctly call a snippet
clean), and race the clock. Results feed a live leaderboard.

See [docs/handoff-brief.md](docs/handoff-brief.md) for the full spec this was
built from, and [docs/spot-the-vuln-mockup.html](docs/spot-the-vuln-mockup.html)
for the approved visual reference.

## Stack

Next.js (App Router, TypeScript) · Prisma · Postgres · Docker/Compose as a
portable fallback if this moves off Vercel.

## Local development

1. Copy `.env.example` to `.env` and fill in `AUTH_SECRET` (see the comment
   in that file for how to generate one).
2. Start a local Postgres:
   ```bash
   docker compose up -d postgres
   ```
3. Install dependencies and apply migrations:
   ```bash
   npm install
   npx prisma migrate dev
   ```
4. Seed the 10 challenges:
   ```bash
   npm run db:seed
   ```
5. Run the dev server:
   ```bash
   npm run dev
   ```

## Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Connection used by the app. On a serverless host this must be a **pooled** string, since every invocation opens its own connection. |
| `DIRECT_URL` | Used only by `prisma migrate`. Must **bypass the pooler**, because migrations take session-level advisory locks that transaction pooling does not support. Same value as above where there is no pooler. |
| `AUTH_SECRET` | Signs the visitor session cookie. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. |
| `ATTEMPT_STALE_MINUTES` | How long an in-progress run can idle before the visitor is asked to restart. Defaults to 20. |

## Deploying to Vercel

Import the repository, set the four variables above, deploy. Nothing else
to configure: the build script generates the Prisma client, and no
Vercel-specific feature is used.

Migrations are deliberately **not** part of the build, so that the Docker
image can be built without database credentials. Apply schema changes
with `npm run db:migrate` before deploying.

Put the serverless functions in the same region as the database. A booth
run is timed, and a cross-region round trip on every query is noticeable.

## Deploying elsewhere (not Vercel)

Everything is driven by env vars, so moving hosts is a redeploy, not a
rewrite.

```bash
docker compose run --rm migrate   # apply migrations against the target DB
docker compose up -d app          # build and run the app
```

`Dockerfile` and `docker-compose.yml` are insurance for a non-Vercel host.
Vercel builds this app natively and ignores both.
