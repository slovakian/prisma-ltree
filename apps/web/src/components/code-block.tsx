import { cn } from "@/lib/utils";

interface CodeBlockProps {
  code: string;
  lang?: string;
  className?: string;
}

/**
 * Minimal, dependency-free code display. We intentionally avoid a syntax
 * highlighter for now — the site is kept simple until the full docs site lands.
 */
export function CodeBlock({ code, lang = "ts", className }: CodeBlockProps) {
  return (
    <div className={cn("group relative overflow-hidden border border-border bg-card", className)}>
      <div className="flex items-center justify-between border-b border-border bg-muted/50 px-3 py-1.5">
        <span className="text-xs text-muted-foreground select-none">{lang}</span>
      </div>
      <pre className="overflow-x-auto p-4 text-xs leading-relaxed">
        <code className="font-mono">{code}</code>
      </pre>
    </div>
  );
}
