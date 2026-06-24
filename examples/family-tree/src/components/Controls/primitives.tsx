import type { ReactNode } from "react";
import { cn } from "~/lib/utils";

/**
 * Shared aside-control idioms (Phase 5). The operator-showcase aside is one
 * parchment `--card` surface — no boxy cards — so each control renders as a
 * hairline-topped `ControlSection` with a mono section label, matching the
 * Phase 4 `SidePanel` (kicker → hairline rows → operator tags). Reuse these so
 * the aside and the panel read as one system (spec §3.1 / §3.3 / §3.4).
 */

/** A hairline-topped control block: mono section label → italic blurb → body. */
export function ControlSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-border/70 px-4 py-4">
      <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </h3>
      {hint ? (
        <p className="mt-1.5 font-heading text-[13px] leading-snug text-muted-foreground italic">
          {hint}
        </p>
      ) : null}
      <div className="mt-3 space-y-2">{children}</div>
    </section>
  );
}

/**
 * Rust method chip + faint mono SQL — the operator-tag idiom established in the
 * Phase 4 panel. Keeps the aside and panel reading as one operator showcase.
 */
export function OperatorTag({
  name,
  sql,
  className,
}: {
  name: string;
  sql: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <span className="rounded border border-primary/30 bg-primary/5 px-1.5 py-0.5 font-mono text-[0.7rem] text-primary">
        {name}
      </span>
      <code className="font-mono text-[0.7rem] text-muted-foreground">{sql}</code>
    </div>
  );
}

/** Restrained text-input styling shared across the aside controls. */
export const controlInputClass =
  "h-8 w-full rounded-sm border bg-background px-2 font-mono text-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";

/**
 * A faint hairline-bordered block for operator *output* (resolved MRCA, graft
 * dry-run). Replaces the old filled `bg-muted/60` halos with a restrained,
 * rust-tinted hairline panel that reads as "result", not a nested card.
 */
export const resultBlockClass = "rounded-sm border border-border/60 bg-primary/[0.035] p-2.5";
