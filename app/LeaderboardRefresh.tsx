"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// The landing page doubles as the booth's attract screen, so it should pick
// up finished runs without anyone touching the machine.
export default function LeaderboardRefresh({
  intervalMs = 20000,
}: {
  intervalMs?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return null;
}
