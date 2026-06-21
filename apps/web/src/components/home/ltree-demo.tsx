import { useEffect, useMemo, useState } from "react";
import { CodeBlock } from "@/components/code-block";
import { demoOps, treeEdges, treeNodes } from "@/lib/ltree-demo-data";
import { cn } from "@/lib/utils";
import { LtreeTree } from "./ltree-tree";

const ACCENT = "oklch(0.72 0.14 165)";
const CYCLE_MS = 3400;

interface LtreeDemoProps {
  /** Shiki-highlighted snippets keyed by `demo.<opId>`. */
  codeHighlights: Record<string, { html: string; lang: string }>;
}

export function LtreeDemo({ codeHighlights }: LtreeDemoProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [autoPlaying, setAutoPlaying] = useState(true);

  const activeOp = demoOps[activeIndex];
  const render = useMemo(() => activeOp.compute(treeNodes), [activeOp]);
  const matchCount = Object.values(render).filter((r) => r.state === "primary").length;

  // Auto-advance after hydration; respects reduced-motion and pauses on interaction.
  useEffect(() => {
    if (!autoPlaying) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => {
      setActiveIndex((i) => (i + 1) % demoOps.length);
    }, CYCLE_MS);
    return () => clearInterval(timer);
  }, [autoPlaying]);

  function selectOp(index: number) {
    setActiveIndex(index);
    setAutoPlaying(false);
  }

  const code = codeHighlights[`demo.${activeOp.id}`];

  return (
    <div className="overflow-hidden border border-border">
      <div className="grid gap-px bg-border md:grid-cols-[210px_1fr]">
        {/* Operations rail (desktop) / pills (mobile) */}
        <div className="order-2 flex flex-col bg-background md:order-none md:col-start-1 md:row-start-1">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <span className="text-[11px] tracking-widest text-muted-foreground uppercase">
              Operations
            </span>
            <button
              type="button"
              onClick={() => setAutoPlaying((p) => !p)}
              className="text-[11px] text-muted-foreground hover:text-foreground"
              aria-pressed={autoPlaying}
            >
              {autoPlaying ? "❚❚ pause" : "▶ play"}
            </button>
          </div>
          <div
            role="tablist"
            aria-label="ltree operations"
            className="flex gap-1 overflow-x-auto px-2 pb-3 md:flex-col md:overflow-visible md:pb-4"
          >
            {demoOps.map((op, i) => {
              const active = i === activeIndex;
              return (
                <button
                  key={op.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => selectOp(i)}
                  className={cn(
                    "border-l-2 px-3 py-2 text-left text-xs whitespace-nowrap transition-colors",
                    active
                      ? "bg-muted font-medium text-foreground"
                      : "border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  )}
                  style={active ? { borderLeftColor: ACCENT } : undefined}
                >
                  {op.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tree */}
        <div className="order-1 flex items-center bg-background p-4 md:order-none md:col-start-2 md:row-start-1">
          <LtreeTree
            nodes={treeNodes}
            edges={treeEdges}
            render={render}
            ariaLabel={`${activeOp.label}: ${matchCount} of ${treeNodes.length} nodes highlighted`}
          />
        </div>

        {/* Code strip */}
        <div className="order-3 bg-background md:col-span-2 md:col-start-1 md:row-start-2">
          <div className="border-t border-border px-4 py-3">
            <p className="mb-3 text-sm text-muted-foreground">{activeOp.caption}</p>
            <CodeBlock html={code.html} lang={code.lang} />
            <div className="mt-3 flex flex-col gap-1 text-xs sm:flex-row sm:items-center sm:gap-3">
              <code className="font-mono text-foreground">{activeOp.method}</code>
              <span className="hidden text-muted-foreground sm:inline" aria-hidden="true">
                →
              </span>
              <code className="font-mono text-muted-foreground">{activeOp.sql}</code>
            </div>
          </div>
        </div>
      </div>

      {/* Announce the active operation to assistive tech. */}
      <p className="sr-only" aria-live="polite">
        {activeOp.label}: {activeOp.method}. {matchCount} of {treeNodes.length} nodes match.
      </p>
    </div>
  );
}
