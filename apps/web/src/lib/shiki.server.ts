import { createHighlighter, type Highlighter } from "shiki";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

const THEME = "tokyo-night";
const LANGS = ["typescript", "bash"] as const;

// Cloudflare Workers disallow runtime WASM instantiation (oniguruma). The JS
// regex engine avoids WebAssembly and works in SSR/prerender and at the edge.
const engine = createJavaScriptRegexEngine();

let highlighterPromise: Promise<Highlighter> | undefined;

function getHighlighter(): Promise<Highlighter> {
  highlighterPromise ??= createHighlighter({
    themes: [THEME],
    langs: [...LANGS],
    engine,
  });
  return highlighterPromise;
}

function normalizeLang(lang: string): string {
  if (lang === "ts") {
    return "typescript";
  }
  return lang;
}

export async function highlightCode(code: string, lang: string): Promise<string> {
  const highlighter = await getHighlighter();
  return highlighter.codeToHtml(code.trimEnd(), {
    lang: normalizeLang(lang),
    theme: THEME,
  });
}

export async function highlightCodeBlocks(
  blocks: ReadonlyArray<{ readonly id: string; readonly code: string; readonly lang: string }>,
): Promise<Record<string, { html: string; lang: string }>> {
  const entries = await Promise.all(
    blocks.map(async (block) => {
      const html = await highlightCode(block.code, block.lang);
      return [block.id, { html, lang: block.lang }] as const;
    }),
  );
  return Object.fromEntries(entries);
}
