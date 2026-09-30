import "server-only";
import { Prisma, type Attempt } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export function getStaleMinutes() {
  const raw = process.env.ATTEMPT_STALE_MINUTES;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 20;
}

export function isAttemptStale(
  attempt: Pick<Attempt, "startedAt" | "finishedAt">
) {
  if (attempt.finishedAt || !attempt.startedAt) return false;
  const staleMs = getStaleMinutes() * 60_000;
  return Date.now() - attempt.startedAt.getTime() > staleMs;
}

export async function findOrCreateUser(name: string, phone: string) {
  return prisma.user.upsert({
    where: { name_phone: { name, phone } },
    update: {},
    create: { name, phone },
  });
}

export async function latestAttemptForUser(userId: string) {
  return prisma.attempt.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function startNewAttempt(userId: string) {
  return prisma.attempt.create({ data: { userId } });
}

// Ensures the (name, phone) pair always resolves to an attempt: reuses the
// latest one (finished, stale, or in-progress; the caller decides what to
// do with each) rather than creating a fresh attempt on every login.
export async function resolveLoginAttempt(userId: string) {
  const latest = await latestAttemptForUser(userId);
  return latest ?? startNewAttempt(userId);
}

export async function getCurrentChallenge(attemptId: string) {
  const [answered, totalChallenges] = await Promise.all([
    prisma.submission.findMany({
      where: { attemptId },
      select: { challengeId: true },
    }),
    prisma.challenge.count(),
  ]);
  const answeredIds = answered.map((s) => s.challengeId);
  const challenge = await prisma.challenge.findFirst({
    where: { id: { notIn: answeredIds } },
    orderBy: { orderIndex: "asc" },
  });
  return { challenge, answeredCount: answered.length, totalChallenges };
}

// Idempotent, guarded by `startedAt IS NULL` so a resumed/re-rendered
// challenge-1 page never resets the timer once it's running.
export async function ensureAttemptStarted(attemptId: string) {
  await prisma.attempt.updateMany({
    where: { id: attemptId, startedAt: null },
    data: { startedAt: new Date() },
  });
}

export type SubmitResult =
  | { status: "already-answered" }
  | { status: "recorded"; isCorrect: boolean; finished: boolean };

export async function submitAnswer(
  attemptId: string,
  challengeId: string,
  selectedLine: number | null
): Promise<SubmitResult> {
  // The challenge id comes from the client, so only accept an answer for the
  // challenge this attempt is actually on: no answering ahead, and no
  // resubmitting from a stale tab.
  const { challenge } = await getCurrentChallenge(attemptId);
  if (!challenge || challenge.id !== challengeId) {
    return { status: "already-answered" };
  }

  const isCorrect = selectedLine === challenge.correctLine;

  try {
    await prisma.submission.create({
      data: { attemptId, challengeId, selectedLine, isCorrect },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      // Already locked in: no back navigation, no answer changes.
      return { status: "already-answered" };
    }
    throw err;
  }

  const [answeredCount, totalChallenges] = await Promise.all([
    prisma.submission.count({ where: { attemptId } }),
    prisma.challenge.count(),
  ]);

  const finished = answeredCount >= totalChallenges;
  if (finished) {
    await prisma.attempt.updateMany({
      where: { id: attemptId, finishedAt: null },
      data: { finishedAt: new Date() },
    });
  }

  return { status: "recorded", isCorrect, finished };
}

export type LeaderboardEntry = {
  attemptId: string;
  name: string;
  correct: number;
  elapsedMs: number;
};

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  // Both timestamps are required to compute elapsed time; an attempt missing
  // either one can't be ranked, and must not take the whole board down with it.
  const attempts = await prisma.attempt.findMany({
    where: { finishedAt: { not: null }, startedAt: { not: null } },
    include: {
      user: true,
      submissions: { where: { isCorrect: true }, select: { id: true } },
    },
  });

  return attempts
    .map((a) => ({
      attemptId: a.id,
      name: a.user.name,
      correct: a.submissions.length,
      elapsedMs: a.finishedAt!.getTime() - a.startedAt!.getTime(),
    }))
    .sort((a, b) => b.correct - a.correct || a.elapsedMs - b.elapsedMs);
}

export type AnswerReview = {
  orderIndex: number;
  title: string;
  vulnCategory: string;
  isCorrect: boolean;
};

// Per-challenge outcome for the results screen. Deliberately does not include
// `correctLine`: visitors see what they missed, not the answer key.
export async function getAnswerBreakdown(
  attemptId: string
): Promise<AnswerReview[]> {
  const submissions = await prisma.submission.findMany({
    where: { attemptId },
    include: { challenge: true },
  });

  return submissions
    .map((s) => ({
      orderIndex: s.challenge.orderIndex,
      title: s.challenge.title,
      vulnCategory: s.challenge.vulnCategory,
      isCorrect: s.isCorrect,
    }))
    .sort((a, b) => a.orderIndex - b.orderIndex);
}

export async function getResultsForAttempt(attemptId: string) {
  const leaderboard = await getLeaderboard();
  const index = leaderboard.findIndex((row) => row.attemptId === attemptId);
  return {
    top: leaderboard.slice(0, 10),
    rank: index === -1 ? null : index + 1,
    total: leaderboard.length,
    entry: index === -1 ? null : leaderboard[index],
  };
}
