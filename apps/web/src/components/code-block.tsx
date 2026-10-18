import { useMemo } from "react";

import { highlightCodeFence } from "@/lib/highlight";
import { cn } from "@/lib/utils";

interface CodeBlockProps {
  code: string;
  lang?: string;
  title?: string;
  className?: string;
}

/**
 * Standalone highlighted code block for the landing page and interactive demos.
 * Uses TanStack Highlight synchronously (SSR + client) — no server function.
 */
export function CodeBlock({ code, lang = "ts", title, className }: CodeBlockProps) {
  const rendered = useMemo(() => highlightCodeFence(code, lang, title), [code, lang, title]);

  const label = title ?? (lang === "bash" || lang === "shell" ? "sh" : lang);

  return (
    <div
      className={cn(
        // min-w-0: shrink inside CSS grid/flex so long lines scroll in-place
        // instead of expanding past the viewport (home SETUP is a 2-col grid).
        "th-codeblock group relative min-w-0 max-w-full overflow-hidden border border-border bg-card text-card-foreground",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-1.5">
        <span className="text-xs text-muted-foreground select-none">{label}</span>
      </div>
      {/*
        Scroll on this body (same idea as docs `tm-code-frame` / InstallCommand):
        size the inner <pre> to its content (`w-max`) so overflow lands here.
      */}
      <div
        className="th-codeblock-body min-w-0 overflow-x-auto overscroll-x-contain text-xs leading-relaxed [&_pre.th-code]:m-0 [&_pre.th-code]:w-max [&_pre.th-code]:min-w-full [&_pre.th-code]:overflow-x-visible [&_pre.th-code]:bg-transparent [&_pre.th-code]:p-4 [&_pre.th-code]:font-mono [&_pre.th-code]:text-xs [&_pre.th-code]:leading-relaxed"
        dangerouslySetInnerHTML={{ __html: rendered.htmlMarkup }}
      />
    </div>
  );
}
