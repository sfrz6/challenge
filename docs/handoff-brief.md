# Spot the Vuln — Build Brief

Booth challenge web app for the AppSec team's October event. Visitors work through 10 code snippets, identify the vulnerable line (or correctly call a snippet clean), and race the clock. Results feed a live leaderboard.

## Stack

- Next.js (TypeScript)
- Prisma ORM
- Postgres, via Neon (portable connection string, works identically on any host)
- Docker + docker-compose for local dev and portability to any infra
- Deploy target: Vercel (native build, not the Dockerfile — Dockerfile is insurance for moving to a different host later, not what Vercel actually runs)

Portability requirement: the lead may decide to host this somewhere other than Vercel. Nothing should depend on Vercel-specific features (no Vercel KV, Edge Config, or Cron). All config through environment variables (`DATABASE_URL`, `AUTH_SECRET`, etc.) so moving hosts is a redeploy, not a rewrite.

## Data model

```prisma
model User {
  id        String   @id @default(cuid())
  name      String
  phone     String
  createdAt DateTime @default(now())
  attempts  Attempt[]

  @@unique([name, phone])
}

model Challenge {
  id           String   @id @default(cuid())
  orderIndex   Int      @unique
  title        String
  snippet      String
  language     String
  correctLine  Int?     // null = "no vulnerability" is the correct answer
  vulnCategory String
  difficulty   String   // easy | medium | hard
  submissions  Submission[]
}

model Attempt {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  startedAt   DateTime? // set when challenge 1 loads
  finishedAt  DateTime? // set when challenge 10 is submitted
  submissions Submission[]
}

model Submission {
  id           String    @id @default(cuid())
  attemptId    String
  attempt      Attempt   @relation(fields: [attemptId], references: [id])
  challengeId  String
  challenge    Challenge @relation(fields: [challengeId], references: [id])
  selectedLine Int?      // null = visitor answered "no vulnerability"
  isCorrect    Boolean
  submittedAt  DateTime  @default(now())
}
```

## Core flow

1. **Login** — name + phone. Same (name, phone) pair resumes the existing attempt rather than creating a new one (prevents infinite retries via re-registration).
2. **Challenge page** (one of 10) — snippet rendered with clickable line numbers, plus a separate "No vulnerability" action. No free-text input for the answer.
3. **Submit** — locks that answer server-side (compare against `correctLine`, never send the answer to the client), advances to the next challenge. No back navigation once submitted.
4. **Timing** — `startedAt` set once, when challenge 1 loads. `finishedAt` set once, when challenge 10 is submitted. Total elapsed = `finishedAt - startedAt`. No per-challenge timing needed, though `submittedAt` on each `Submission` is free data worth keeping for a post-event "hardest challenge" report.
5. **Results page** — score, total elapsed time, current leaderboard rank.
6. **Leaderboard** — only attempts where `finishedAt IS NOT NULL`. Sort by correct count descending, then elapsed time ascending (speed is the tiebreaker, not a primary score).
7. **Abandoned runs** — if `finishedAt` stays null, the attempt never appears on the leaderboard. If a visitor returns to a stale in-progress attempt, show a "session expired, please restart" state rather than resuming mid-challenge after a long gap.

## Challenge set (10, easy → hard, trap in the middle)

| # | Category | Difficulty |
|---|---|---|
| 1 | Reflected XSS | Easy |
| 2 | SQL injection (string concat) | Easy |
| 3 | Hardcoded credentials / secrets | Easy–Medium |
| 4 | IDOR (missing ownership check) | Medium |
| 5 | **No vulnerability (trap)** | Medium |
| 6 | Path traversal | Medium |
| 7 | Command injection | Medium–Hard |
| 8 | Broken auth logic (client-controlled role claim) | Hard |
| 9 | SSRF | Hard |
| 10 | Insecure deserialization | Hard |

Challenge 5 is deliberately mid-sequence, not last — it breaks pattern-matching habits before the harder back half, rather than testing final-stretch restraint only.

Each challenge needs: title, snippet (with language), `correctLine` (or null), `vulnCategory`, `difficulty`. Store as seed data (DB rows), not hardcoded in components, so content can be edited without touching code.

## Brand reference

Colors pulled directly from the team's existing AppSec presentation deck:

| Role | Hex |
|---|---|
| Primary navy | `#00349B` |
| Deep navy / text | `#0A1330` / `#121A2E` |
| Accent cyan | `#00AFF1` |
| Slate blue (secondary) | `#3D6E8F` |
| Light background | `#F4F7FC` |
| Light blue tints | `#DCE3EE`, `#CBD8EC`, `#C7DAF6` |
| Muted text | `#667793`, `#9AA6B2` |
| Critical / incorrect | `#9B2226` |
| Warning / medium difficulty | `#E4B23C` |
| Orange (secondary warning) | `#E07A2F` |
| Base | `#FFFFFF` |

Typography: IBM Plex Sans for UI text, IBM Plex Mono for code and data (timer, scores, line numbers).

An approved static HTML mockup (login, challenge, results/leaderboard screens) is attached alongside this brief — match its layout, spacing, and component structure: bordered code panel styled like an editor with line numbers and syntax coloring, thin segmented progress bar (not numbered step circles), difficulty tag top-right, "No vulnerability" as a separate ghost button next to Submit.

## Build order

1. Scaffold: Next.js + TypeScript, Prisma, Dockerfile + docker-compose.yml with local Postgres. Git init, commit skeleton before feature code.
2. Write the Prisma schema above, connect a Neon Postgres instance, run first migration.
3. Seed script inserting the 10 challenges as data rows.
4. Login/session: name + phone form, dedupe-and-resume on the same pair.
5. Challenge page + submission API: click-line-or-no-vuln UI, server-side answer check, lock on submit, no back nav.
6. Timing: `startedAt` on challenge 1 load, `finishedAt` on challenge 10 submit.
7. Leaderboard: query joining Attempt + Submission, filter `finishedAt IS NOT NULL`, sort correct desc then elapsed asc.
8. End-to-end test locally, then deploy to Vercel with the same `DATABASE_URL`.

## Open decisions for whoever picks this up

- Final hosting target (Vercel vs. something else the lead decides) — nothing in the build should assume Vercel-only, per the stack notes above.
- Exact snippet content/wording for challenges 2–10 (challenge 5's "no vuln" snippet and challenge 4's IDOR example can reuse the account-lookup style shown in the mockup).
