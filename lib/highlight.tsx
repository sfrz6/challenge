import type { ReactNode } from "react";

// Union of keywords across every language in the challenge set. Kept as one
// list on purpose: a per-language tokenizer would be a lot of machinery for
// what is only ever decoration on a fixed set of seeded snippets.
const KEYWORDS = [
  // python
  "def", "elif", "lambda", "None", "True", "False", "with", "is", "not",
  "and", "or", "pass", "raise", "yield", "global", "nonlocal", "assert", "del",
  // shared c-family
  "if", "else", "for", "while", "return", "break", "continue", "switch",
  "case", "try", "catch", "finally", "throw", "throws", "new", "class",
  "import", "from", "as", "export", "default", "async", "await", "this",
  "typeof", "instanceof", "null", "undefined", "true", "false",
  "const", "let", "var", "function",
  // php
  "elseif", "foreach", "public", "private", "protected", "static", "use",
  "namespace", "echo", "exit", "array", "void",
  // java
  "final", "package", "boolean", "int", "long", "byte",
  // ruby
  "end", "module", "unless", "elsif", "do", "require", "begin", "rescue",
  "ensure", "nil",
  // go
  "func", "struct", "interface", "range", "defer", "chan", "string", "bool",
  "map",
];

const TOKEN_RE = new RegExp(
  [
    "(#.*$)", // python / ruby / php hash comment
    "(//.*$)", // c-family line comment
    '("(?:[^"\\\\]|\\\\.)*")', // double-quoted string
    "('(?:[^'\\\\]|\\\\.)*')", // single-quoted string
    "(`(?:[^`\\\\]|\\\\.)*`)", // template / raw string
    "(<\\?php|\\?>)", // php open/close tag
    "(\\$[A-Za-z_]\\w*)", // php variable
    "(@[\\w.]+)", // decorator / annotation
    "(?<![\\w:]):[a-z_]\\w*", // ruby symbol
    `\\b(${KEYWORDS.join("|")})\\b`,
    "\\b([A-Za-z_]\\w*)(?=\\s*\\()", // function call
  ].join("|"),
  "g"
);

const CLASS_BY_GROUP: Record<number, string> = {
  1: "cm",
  2: "cm",
  3: "str",
  4: "str",
  5: "str",
  6: "kw",
  7: "var",
  8: "kw",
  9: "kw",
  10: "fn",
};

// Small regex highlighter matching the mockup's token classes. Deliberately
// renders plain React text nodes rather than dangerouslySetInnerHTML: these
// snippets are attacker-shaped code by design.
export function highlightLine(code: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  TOKEN_RE.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = TOKEN_RE.exec(code))) {
    if (match.index > lastIndex) {
      nodes.push(code.slice(lastIndex, match.index));
    }

    const text = match[0];
    let className = text.startsWith(":") ? "str" : "";
    for (const [group, name] of Object.entries(CLASS_BY_GROUP)) {
      if (match[Number(group)]) {
        className = name;
        break;
      }
    }

    nodes.push(
      <span key={key++} className={className}>
        {text}
      </span>
    );
    lastIndex = match.index + text.length;
  }

  if (lastIndex < code.length) {
    nodes.push(code.slice(lastIndex));
  }
  return nodes;
}

const FILENAME_BY_LANGUAGE: Record<string, string> = {
  python: "app.py",
  javascript: "server.js",
  typescript: "server.ts",
  php: "index.php",
  java: "Controller.java",
  ruby: "controller.rb",
  go: "handler.go",
  csharp: "Controller.cs",
};

export function filenameForLanguage(language: string) {
  return FILENAME_BY_LANGUAGE[language] ?? "snippet.txt";
}
