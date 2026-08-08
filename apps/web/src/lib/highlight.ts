import { createHighlighter } from "@tanstack/highlight/core";
import { js } from "@tanstack/highlight/languages/js";
import { json } from "@tanstack/highlight/languages/json";
import { plaintext } from "@tanstack/highlight/languages/plaintext";
import { shell } from "@tanstack/highlight/languages/shell";
import { sql } from "@tanstack/highlight/languages/sql";
import { ts } from "@tanstack/highlight/languages/ts";
import { tsx } from "@tanstack/highlight/languages/tsx";
import { createTanStackMarkdownHighlighter, renderCodeFence } from "@tanstack/highlight/markdown";
import type { CodeHighlighter } from "@tanstack/markdown";

/**
 * Shared isomorphic highlighter for docs + landing code samples.
 * Synchronous — safe during TanStack Start SSR and client hydration.
 */
export const highlighter = createHighlighter({
  languages: [plaintext, js, json, shell, sql, ts, tsx],
});

/** Adapter for TanStack Markdown's `highlighter` callback. */
export const highlightMarkdownCode: CodeHighlighter =
  createTanStackMarkdownHighlighter(highlighter);

export function highlightCodeFence(code: string, lang: string, title?: string) {
  return renderCodeFence({ code, lang, title }, highlighter);
}
