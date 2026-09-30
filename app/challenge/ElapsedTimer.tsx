"use client";

import { useEffect, useState } from "react";
import { formatDuration } from "@/lib/format";

// Renders nothing until mounted: the server can't know the viewer's clock,
// and a server-rendered time would hydrate into a mismatch a second later.
export default function ElapsedTimer({ startedAtMs }: { startedAtMs: number }) {
  const [elapsed, setElapsed] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setElapsed(Date.now() - startedAtMs);
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAtMs]);

  return (
    <span className="ch-timer" aria-label="Elapsed time">
      {elapsed === null ? "--:--" : formatDuration(elapsed)}
    </span>
  );
}
