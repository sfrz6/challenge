import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// Reachable without a run in progress: the landing/leaderboard screen and
// the sign-in form.
const PUBLIC_PATHS = new Set(["/", "/login"]);

// State-machine routing for the top-level screens. Each page still re-derives
// its own detailed state (current challenge, staleness). This only handles
// the coarse redirects: no run -> landing, finished -> results, in progress
// -> challenge.
export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();
    return NextResponse.redirect(new URL("/", request.url));
  }

  const attempt = await prisma.attempt.findUnique({
    where: { id: session.attemptId },
    select: { finishedAt: true },
  });

  if (!attempt) {
    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  if (attempt.finishedAt) {
    // A finished run may browse the leaderboard and come back to its own
    // results, but opening the sign-in form ends it, so a shared booth
    // machine never hands the previous visitor's run to the next person.
    if (pathname === "/login") {
      const response = NextResponse.next();
      response.cookies.delete(SESSION_COOKIE);
      return response;
    }
    if (pathname === "/challenge") {
      return NextResponse.redirect(new URL("/results", request.url));
    }
    return NextResponse.next();
  }

  // Mid-run, everything except the challenge itself is a dead end. Send them
  // back to where they left off rather than letting them abandon the clock
  // or re-register under a new name.
  if (pathname !== "/challenge") {
    return NextResponse.redirect(new URL("/challenge", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/challenge", "/results"],
};
