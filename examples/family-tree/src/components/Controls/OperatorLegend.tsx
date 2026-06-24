import { cn } from "~/lib/utils";
import { ControlSection } from "./primitives";

/**
 * The showcase matrix as a live legend. Every ltree operator/function the viewer
 * can fire is listed with its method name and SQL lowering; the operator(s)
 * currently driving the canvas highlight (passed in `activeOps`) glow so it's
 * obvious which extension primitive each interaction lowered to.
 */

export type OperatorLegendProps = {
  /** Method names of the operators invoked by the latest action. */
  activeOps: ReadonlySet<string>;
};

type Entry = { op: string; sql: string };
type Group = { title: string; entries: Entry[] };

const GROUPS: Group[] = [
  {
    title: "Hierarchy",
    entries: [
      { op: "isAncestorOf", sql: "@>" },
      { op: "isDescendantOf", sql: "<@" },
      { op: "lca", sql: "lca(…)" },
    ],
  },
  {
    title: "Pattern match",
    entries: [
      { op: "matchesLquery", sql: "~" },
      { op: "matchesLqueryArray", sql: "?" },
      { op: "matchesLtxtquery", sql: "@" },
    ],
  },
  {
    title: "Depth & slices",
    entries: [
      { op: "nlevel", sql: "nlevel()" },
      { op: "subpath", sql: "subpath()" },
      { op: "subltree", sql: "subltree()" },
      { op: "indexOf", sql: "index()" },
    ],
  },
  {
    title: "Mutate",
    entries: [{ op: "concatText", sql: "|| text" }],
  },
];

export function OperatorLegend({ activeOps }: OperatorLegendProps) {
  return (
    <ControlSection
      title="Operator matrix"
      hint="Every control lowers to one of these ltree primitives. Active ones glow."
    >
      <div className="space-y-2.5">
        {GROUPS.map((group) => (
          <div key={group.title} className="space-y-1">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted-foreground">
              {group.title}
            </p>
            <ul className="space-y-0.5">
              {group.entries.map((e) => {
                const active = activeOps.has(e.op);
                return (
                  <li
                    key={e.op}
                    className={cn(
                      "flex items-center gap-2 rounded-sm px-1.5 py-0.5 text-xs transition-colors",
                      active
                        ? "bg-primary/10 text-primary ring-1 ring-primary/25"
                        : "text-foreground/80",
                    )}
                  >
                    <span className={cn("font-mono text-[0.72rem]", active && "font-medium")}>
                      {e.op}
                    </span>
                    <code
                      className={cn(
                        "ml-auto font-mono text-[0.7rem]",
                        active ? "text-primary/70" : "text-muted-foreground",
                      )}
                    >
                      {e.sql}
                    </code>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </ControlSection>
  );
}
