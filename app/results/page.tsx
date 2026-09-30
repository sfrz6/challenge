import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getAnswerBreakdown, getResultsForAttempt } from "@/lib/attempt";
import { formatDuration } from "@/lib/format";
import { logoutAction } from "@/app/actions";

export default async function ResultsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  const attempt = await prisma.attempt.findUnique({
    where: { id: session.attemptId },
  });
  if (!attempt || !attempt.finishedAt) {
    redirect("/challenge");
  }

  const { top, rank, entry } = await getResultsForAttempt(attempt.id);
  const [totalChallenges, breakdown] = await Promise.all([
    prisma.challenge.count(),
    getAnswerBreakdown(attempt.id),
  ]);
  const correct = entry?.correct ?? 0;
  const elapsedMs = entry?.elapsedMs ?? 0;

  const isInTop = top.some((row) => row.attemptId === attempt.id);
  const rows = isInTop || !entry || !rank
    ? top.map((row, index) => ({ row, rank: index + 1 }))
    : [...top.map((row, index) => ({ row, rank: index + 1 })), { row: entry, rank }];

  return (
    <div className="screen">
      <div className="results-nav">
        <Link href="/" className="btn-back">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M10 12.5L5.5 8 10 3.5"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Home
        </Link>
      </div>

      <div className="res-hero">
        <div className="res-score">
          {correct}
          <span>/{totalChallenges}</span>
        </div>
        <div className="res-label">correct</div>
        <div className="res-stats">
          <div className="res-stat">
            <b>{formatDuration(elapsedMs)}</b>
            <span>total time</span>
          </div>
          <div className="res-stat">
            <b>{rank ? `#${rank}` : "n/a"}</b>
            <span>current rank</span>
          </div>
          <div className="res-stat">
            <b>{totalChallenges - correct}</b>
            <span>missed</span>
          </div>
        </div>
      </div>
      <h3 className="section-heading">Your answers</h3>
      <div className="card">
        <ol className="review">
          {breakdown.map((item) => (
            <li key={item.orderIndex} className={item.isCorrect ? "hit" : "miss"}>
              <span className="review-index">
                {String(item.orderIndex).padStart(2, "0")}
              </span>
              <span className="review-title">{item.title}</span>
              <span className="review-category">{item.vulnCategory}</span>
              <span className="review-mark">{item.isCorrect ? "✓" : "✕"}</span>
            </li>
          ))}
        </ol>
      </div>

      <h3 className="section-heading">Leaderboard</h3>
      <div className="card">
        <table className="lb">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Name</th>
              <th>Score</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ row, rank: rowRank }) => (
              <tr
                key={row.attemptId}
                className={row.attemptId === attempt.id ? "me" : ""}
              >
                <td className={`rank${rowRank <= 3 ? " top" : ""}`}>{rowRank}</td>
                <td>{row.attemptId === attempt.id ? "You" : row.name}</td>
                <td>
                  {row.correct}/{totalChallenges}
                </td>
                <td>{formatDuration(row.elapsedMs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form action={logoutAction} className="next-visitor">
        <button className="btn-ghost" type="submit">
          Next visitor
        </button>
      </form>
    </div>
  );
}
