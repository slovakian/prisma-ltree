import { useState } from "react";
import { Search } from "lucide-react";
import { searchLquery, searchLqueryArray, searchLtxtquery } from "../../server/taxonomy.functions";
import { type HighlightState, matchHighlight } from "~/lib/highlight";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { ControlSection, OperatorTag, controlInputClass } from "./primitives";

/**
 * Pattern-search showcase: the three ltree match operators, each over the real
 * column. Picking a mode swaps the input + the SQL lowering shown; running it
 * highlights the matched taxa on the canvas in the `search` color via
 * `matchHighlight`. Presets seed the inputs so the demo is discoverable.
 *
 *  - lquery   (`path ~ $1`)       — single label-path glob, e.g. `*.Hominidae.*`
 *  - lquery[] (`path ? $1`)       — any-of an array of globs, comma-separated
 *  - ltxtquery(`path @ $1`)       — full-text-ish label boolean, e.g. `Homo & !sapiens`
 */

export type SearchControlsProps = {
  onApply: (state: HighlightState, ops: string[], focusPath?: string) => void;
};

type Mode = "lquery" | "lqueryArray" | "ltxtquery";

const MODES: Record<
  Mode,
  { label: string; op: string; sql: string; preset: string; placeholder: string }
> = {
  lquery: {
    label: "lquery",
    op: "matchesLquery",
    sql: "path ~ $1",
    preset: "*.Hominidae.*",
    placeholder: "*.Hominidae.*",
  },
  lqueryArray: {
    label: "lquery[]",
    op: "matchesLqueryArray",
    sql: "path ? $1",
    preset: "*.Pan.*, *.Homo.*",
    placeholder: "*.Pan.*, *.Homo.*",
  },
  ltxtquery: {
    label: "ltxtquery",
    op: "matchesLtxtquery",
    sql: "path @ $1",
    preset: "Homo & !sapiens",
    placeholder: "Homo & !sapiens",
  },
};

export function SearchControls({ onApply }: SearchControlsProps) {
  const [mode, setMode] = useState<Mode>("lquery");
  const [value, setValue] = useState<string>(MODES.lquery.preset);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);

  const meta = MODES[mode];

  function changeMode(next: Mode) {
    setMode(next);
    setValue(MODES[next].preset);
    setError(null);
    setCount(null);
  }

  async function run() {
    const trimmed = value.trim();
    if (!trimmed) return;
    setPending(true);
    setError(null);
    try {
      const rows =
        mode === "lquery"
          ? await searchLquery({ data: trimmed })
          : mode === "ltxtquery"
            ? await searchLtxtquery({ data: trimmed })
            : await searchLqueryArray({
                data: trimmed
                  .split(",")
                  .map((p) => p.trim())
                  .filter(Boolean),
              });
      setCount(rows.length);
      onApply(matchHighlight(rows.map((r) => r.path)), [meta.op], rows[0]?.path);
    } catch (e) {
      setCount(null);
      setError(e instanceof Error ? e.message : "Invalid pattern.");
    } finally {
      setPending(false);
    }
  }

  return (
    <ControlSection
      title="Pattern search"
      hint={
        <>
          Match taxa with ltree’s <code className="font-mono not-italic">~</code>,{" "}
          <code className="font-mono not-italic">?</code>, and{" "}
          <code className="font-mono not-italic">@</code> operators.
        </>
      }
    >
      <div className="flex items-center gap-2">
        <Select value={mode} onValueChange={(v) => changeMode(v as Mode)}>
          <SelectTrigger size="sm" className="w-[7.5rem] shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(MODES) as Mode[]).map((m) => (
              <SelectItem key={m} value={m}>
                {MODES[m].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <OperatorTag name={meta.op} sql={meta.sql} className="min-w-0" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void run();
        }}
        placeholder={meta.placeholder}
        spellCheck={false}
        aria-label={`${meta.label} pattern`}
        className={controlInputClass}
      />
      <Button size="sm" className="w-full" onClick={() => void run()} disabled={pending}>
        <Search />
        {pending ? "Searching…" : "Highlight matches"}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {count != null && !error ? (
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{count}</span> taxa matched.
        </p>
      ) : null}
    </ControlSection>
  );
}
