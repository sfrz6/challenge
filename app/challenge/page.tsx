import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  ensureAttemptStarted,
  getCurrentChallenge,
  isAttemptStale,
} from "@/lib/attempt";
import { filenameForLanguage, highlightLine } from "@/lib/highlight";
import { restartAction } from "@/app/actions";
import ChallengeClient from "./ChallengeClient";
import ElapsedTimer from "./ElapsedTimer";

export default async function ChallengePage() {
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  const attempt = await prisma.attempt.findUnique({
    where: { id: session.attemptId },
  });
  if (!attempt) {
    redirect("/");
  }
  if (attempt.finishedAt) {
    redirect("/results");
  }

  if (isAttemptStale(attempt)) {
    return (
      <div className="screen">
        <div className="expired-wrap">
          <h1>Session expired</h1>
          <p>
            This attempt has been idle too long. Start a fresh run. Your
            previous progress won&apos;t count toward the leaderboard.
          </p>
          <form action={restartAction}>
            <button className="btn-primary" type="submit">
              Restart
            </button>
          </form>
        </div>
      </div>
    );
  }

  const { challenge, answeredCount, totalChallenges } = await getCurrentChallenge(
    attempt.id
  );

  if (!challenge) {
    redirect("/results");
  }

  if (challenge.orderIndex === 1) {
    await ensureAttemptStarted(attempt.id);
  }

  // On challenge 1 the clock was started by the call just above, so the
  // attempt row we read before it still has a null startedAt.
  const startedAtMs = (attempt.startedAt ?? new Date()).getTime();

  const lines = challenge.snippet.split("\n").map((code, index) => ({
    number: index + 1,
    content: highlightLine(code),
  }));

  return (
    <div className="screen">
      <div className="ch-head">
        <span className="ch-count">
          CHALLENGE {String(challenge.orderIndex).padStart(2, "0")} /{" "}
          {String(totalChallenges).padStart(2, "0")}
        </span>
        <div className="ch-meta">
          <ElapsedTimer startedAtMs={startedAtMs} />
          <span className={`tag tag-${challenge.difficulty}`}>
            {challenge.difficulty[0].toUpperCase() +
              challenge.difficulty.slice(1)}
          </span>
        </div>
      </div>
      <div className="progress">
        {Array.from({ length: totalChallenges }, (_, index) => {
          const position = index + 1;
          const className =
            position <= answeredCount
              ? "done"
              : position === answeredCount + 1
                ? "current"
                : "";
          return <i key={position} className={className} />;
        })}
      </div>
      <h2 className="ch-title">{challenge.title}</h2>
      <p className="ch-sub">
        Click the line that&apos;s vulnerable, or mark the snippet clean if
        nothing&apos;s wrong.
      </p>

      <ChallengeClient
        key={challenge.id}
        challengeId={challenge.id}
        filename={filenameForLanguage(challenge.language)}
        language={challenge.language}
        lines={lines}
      />
    </div>
  );
}
