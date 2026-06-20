import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const PACKAGE = "prisma-ltree";

/**
 * Package managers in the order we want to surface them. `command` is the
 * verb that precedes the package name (e.g. `pnpm add`, `npm install`).
 */
const MANAGERS = [
  { id: "pnpm", command: "pnpm add" },
  { id: "bun", command: "bun add" },
  { id: "npm", command: "npm install" },
  { id: "yarn", command: "yarn add" },
] as const;

type ManagerId = (typeof MANAGERS)[number]["id"];

/**
 * Client-side install snippet with a package-manager switcher and copy button.
 * Unlike the prose CodeBlocks this is interactive, so it renders on the client
 * and skips the server Shiki pipeline. Colors follow the active light/dark
 * theme via semantic tokens.
 */
export function InstallCommand({ className }: { className?: string }) {
  const [active, setActive] = useState<ManagerId>("pnpm");
  const [copied, setCopied] = useState(false);

  const current = MANAGERS.find((m) => m.id === active) ?? MANAGERS[0];

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${current.command} ${PACKAGE}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — fail quietly.
    }
  }

  return (
    <Tabs
      value={active}
      onValueChange={(value) => setActive(value as ManagerId)}
      className={cn(
        "group gap-0 overflow-hidden border border-border bg-card text-card-foreground",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-border bg-muted/40 pr-1.5 pl-1">
        <TabsList variant="line" className="h-auto gap-0 bg-transparent p-0 text-muted-foreground">
          {MANAGERS.map((m) => (
            <TabsTrigger
              key={m.id}
              value={m.id}
              className="rounded-none px-3 py-1.5 text-xs text-muted-foreground after:bottom-[-1px] after:bg-primary hover:text-foreground data-active:bg-transparent data-active:text-foreground data-active:after:opacity-100"
            >
              {m.id}
            </TabsTrigger>
          ))}
        </TabsList>
        <button
          type="button"
          onClick={copy}
          aria-label="Copy install command"
          className="flex size-7 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
        >
          {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
        </button>
      </div>

      {MANAGERS.map((m) => (
        <TabsContent key={m.id} value={m.id} className="overflow-x-auto p-4">
          <pre className="m-0 font-mono text-xs leading-relaxed">
            <code>
              <span className="text-primary">{m.command.split(" ")[0]}</span>{" "}
              <span className="text-muted-foreground">{m.command.split(" ")[1]}</span>{" "}
              <span className="install-rainbow font-medium">{PACKAGE}</span>
            </code>
          </pre>
        </TabsContent>
      ))}
    </Tabs>
  );
}
