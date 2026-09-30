import Link from "next/link";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLeaderboard } from "@/lib/attempt";
import { formatDuration } from "@/lib/format";
import LeaderboardRefresh from "./LeaderboardRefresh";

export default async function HomePage() {
  // No cookies/headers on this page, so without this the leaderboard would be
  // baked in at build time and never move during the event.
  await connection();

  const [leaderboard, challenges] = await Promise.all([
    getLeaderboard(),
    prisma.challenge.findMany({ select: { language: true } }),
  ]);

  const totalChallenges = challenges.length;
  const totalLanguages = new Set(challenges.map((c) => c.language)).size;
  const top = leaderboard.slice(0, 10);

  return (
    <div className="screen landing">
      <section className="landing-hero">
        <h1>Spot the Vuln</h1>
        <p>
          {totalChallenges} real-world snippets across {totalLanguages}{" "}
          languages. Find the vulnerable line, or call it clean. Fastest
          correct run takes the top spot.
        </p>
        <Link href="/login" className="btn-cta">
          Start spotting
        </Link>
        <ul className="login-steps">
          <li>
            <b>1</b>Read the snippet
          </li>
          <li>
            <b>2</b>Click the vulnerable line
          </li>
          <li>
            <b>3</b>Or call it clean
          </li>
        </ul>
      </section>

      <section>
        <div className="board-head">
          <h2 className="section-heading">Leaderboard</h2>
          <span className="board-count">
            {leaderboard.length === 1
              ? "1 run completed"
              : `${leaderboard.length} runs completed`}
          </span>
        </div>

        <div className="card">
          {top.length === 0 ? (
            <p className="lb-empty">
              No runs yet. Be the first name on the board.
            </p>
          ) : (
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
                {top.map((row, index) => (
                  <tr key={row.attemptId}>
                    <td className={`rank${index < 3 ? " top" : ""}`}>
                      {index + 1}
                    </td>
                    <td>{row.name}</td>
                    <td>
                      {row.correct}/{totalChallenges}
                    </td>
                    <td>{formatDuration(row.elapsedMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <LeaderboardRefresh />
    </div>
  );
}
