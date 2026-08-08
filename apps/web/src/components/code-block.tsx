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
        "th-codeblock group relative overflow-hidden border border-border bg-card text-card-foreground",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-1.5">
        <span className="text-xs text-muted-foreground select-none">{label}</span>
      </div>
      <div
        className="overflow-x-auto p-4 text-xs leading-relaxed [&_pre]:m-0 [&_pre]:bg-transparent [&_pre]:p-0 [&_pre]:font-mono [&_pre]:text-xs [&_pre]:leading-relaxed"
        dangerouslySetInnerHTML={{ __html: rendered.htmlMarkup }}
      />
    </div>
  );
}
