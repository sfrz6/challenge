"use server";

import { redirect } from "next/navigation";
import { createSession, getSession, clearSession } from "@/lib/session";
import {
  findOrCreateUser,
  resolveLoginAttempt,
  startNewAttempt,
  submitAnswer,
} from "@/lib/attempt";

export async function loginAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!name || !phone) {
    redirect("/login?error=missing");
  }

  const user = await findOrCreateUser(name, phone);
  const attempt = await resolveLoginAttempt(user.id);
  await createSession({ userId: user.id, attemptId: attempt.id });

  redirect(attempt.finishedAt ? "/results" : "/challenge");
}

export async function restartAction() {
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  const attempt = await startNewAttempt(session.userId);
  await createSession({ userId: session.userId, attemptId: attempt.id });

  redirect("/challenge");
}

export async function submitAction(
  challengeId: string,
  selectedLine: number | null
) {
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  const result = await submitAnswer(session.attemptId, challengeId, selectedLine);

  redirect(result.status === "recorded" && result.finished ? "/results" : "/challenge");
}

export async function logoutAction() {
  await clearSession();
  redirect("/");
}
