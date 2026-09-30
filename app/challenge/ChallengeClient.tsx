"use client";

import {
  useEffect,
  useState,
  useTransition,
  type ReactNode,
  type KeyboardEvent,
} from "react";
import { submitAction } from "@/app/actions";

type Line = {
  number: number;
  content: ReactNode;
};

export default function ChallengeClient({
  challengeId,
  filename,
  language,
  lines,
}: {
  challengeId: string;
  filename: string;
  language: string;
  lines: Line[];
}) {
  const [selected, setSelected] = useState<number | "clean" | null>(null);
  const [isPending, startTransition] = useTransition();

  // This component is keyed on the challenge, so it remounts per challenge.
  // The next snippet should start from the top of the page, not wherever the
  // previous one was scrolled to.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  function submit(selectedLine: number | null) {
    startTransition(() => {
      submitAction(challengeId, selectedLine);
    });
  }

  function handleLineKeyDown(
    event: KeyboardEvent<HTMLDivElement>,
    lineNumber: number
  ) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setSelected(lineNumber);
    }
  }

  const selectedHint =
    selected === null
      ? "none"
      : selected === "clean"
        ? "no vulnerability"
        : `line ${selected}`;

  return (
    <>
      <div className="code-panel">
        <div className="code-panel-head">
          <span>{filename}</span>
          <span className="code-lang">{language}</span>
        </div>
        <div className="code-body">
          {lines.map((line) => (
            <div
              key={line.number}
              role="button"
              tabIndex={0}
              aria-pressed={selected === line.number}
              className={`code-line${selected === line.number ? " selected" : ""}`}
              onClick={() => setSelected(line.number)}
              onKeyDown={(event) => handleLineKeyDown(event, line.number)}
            >
              <span className="ln">{line.number}</span>
              <span className="code-text">{line.content}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="answer-bar">
        <div className="selected-hint">
          Selected: <b>{selectedHint}</b>
        </div>
        <div className="answer-actions">
          <button
            type="button"
            className="btn-ghost"
            disabled={isPending}
            onClick={() => {
              setSelected("clean");
              submit(null);
            }}
          >
            No vulnerability
          </button>
          <button
            type="button"
            className="btn-submit"
            disabled={isPending || selected === null}
            onClick={() => submit(selected === "clean" ? null : (selected as number))}
          >
            {isPending ? "Locking in…" : "Submit"}
          </button>
        </div>
      </div>
    </>
  );
}
