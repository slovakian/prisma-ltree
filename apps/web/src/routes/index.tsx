import { createFileRoute } from "@tanstack/react-router";
import { CodeBlock } from "@/components/code-block";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      {
        title: "prisma-ltree — PostgreSQL ltree for Prisma Next",
      },
      {
        name: "description",
        content:
          "A Prisma Next extension pack for PostgreSQL's ltree hierarchical-tree type. Type-safe ancestor/descendant checks, lquery/ltxtquery matching, and path manipulation — without raw SQL.",
      },
    ],
  }),
});

const GITHUB_URL = "https://github.com/prisma/prisma";

interface Op {
  method: string;
  sql: string;
}

interface Feature {
  id: string;
  title: string;
  blurb: string;
  ops: Op[];
  example: string;
}

const features: Feature[] = [
  {
    id: "hierarchy",
    title: "Hierarchy checks",
    blurb:
      "Ancestor / descendant containment between two paths. Both lower to native ltree operators and return a boolean.",
    ops: [
      { method: "path.isAncestorOf(rhs)", sql: "ltree @> ltree" },
      { method: "path.isDescendantOf(rhs)", sql: "ltree <@ ltree" },
    ],
    example: `// Every category under "Top.Science"
const plan = sql
  .from(tables.category)
  .select({ id: tables.category.columns.id })
  .where(
    tables.category.columns.path.isDescendantOf(param("prefix")),
  )
  .build({ params: { prefix: "Top.Science" } });`,
  },
  {
    id: "pattern-matching",
    title: "Pattern matching",
    blurb:
      "Match a path against an lquery, an array of lqueries, or a full-text ltxtquery. Patterns are validated string params.",
    ops: [
      { method: "path.matchesLquery(pattern)", sql: "ltree ~ lquery" },
      { method: "path.matchesLqueryArray(patterns)", sql: "ltree ? lquery[]" },
      { method: "path.matchesLtxtquery(query)", sql: "ltree @ ltxtquery" },
    ],
    example: `// Paths like "Top.*.Astronomy" at any depth
sql
  .from(tables.category)
  .where(
    tables.category.columns.path.matchesLquery(
      param("pattern"),
    ),
  )
  .build({ params: { pattern: "Top.*.Astronomy" } });`,
  },
  {
    id: "scalar-functions",
    title: "Scalar functions",
    blurb:
      "Derive depth, slice subpaths, find a label's index, or compute the lowest common ancestor of two or more paths.",
    ops: [
      { method: "path.nlevel()", sql: "nlevel(ltree)" },
      {
        method: "path.subltree(start, end)",
        sql: "subltree(ltree, start, end)",
      },
      {
        method: "path.subpath(offset, len?)",
        sql: "subpath(ltree, offset, len)",
      },
      { method: "path.indexOf(other, off?)", sql: "index(ltree, ltree, off)" },
      { method: "path.lca(other, ...rest)", sql: "lca(ltree, ltree, ...)" },
    ],
    example: `// Project the depth of each path
sql
  .from(tables.category)
  .select({
    id: tables.category.columns.id,
    depth: tables.category.columns.path.nlevel(),
  })
  .build({ params: {} });`,
  },
  {
    id: "concat-convert",
    title: "Concatenation & conversion",
    blurb:
      "Build new paths by concatenating ltrees or text labels, and convert between ltree and text in either direction.",
    ops: [
      { method: "path.concat(rhs)", sql: "ltree || ltree" },
      { method: "path.concatText(label)", sql: "ltree || text" },
      { method: "path.prependText(label)", sql: "text || ltree" },
      { method: "path.toText()", sql: "ltree2text(ltree)" },
      { method: "text.toLtree()", sql: "text2ltree(text)" },
    ],
    example: `// Append a child label to an existing path
sql
  .from(tables.category)
  .select({
    child: tables.category.columns.path.concatText(
      param("label"),
    ),
  })
  .build({ params: { label: "Astronomy" } });`,
  },
  {
    id: "array-first-match",
    title: "Array first-match",
    blurb:
      "First-match operators over an ltree[] column (pg/ltree-array@1 codec, ADR-003). Each returns the first matching path.",
    ops: [
      { method: "paths.firstAncestorOf(rhs)", sql: "ltree[] ?@> ltree" },
      { method: "paths.firstDescendantOf(rhs)", sql: "ltree[] ?<@ ltree" },
      { method: "paths.firstMatchLquery(pattern)", sql: "ltree[] ?~ lquery" },
      {
        method: "paths.firstMatchLtxtquery(query)",
        sql: "ltree[] ?@ ltxtquery",
      },
    ],
    example: `// First stored path that is a descendant of the arg
sql
  .from(tables.node)
  .select({
    match: tables.node.columns.paths.firstDescendantOf(
      param("prefix"),
    ),
  })
  .build({ params: { prefix: "Top.Science" } });`,
  },
];

const installCode = `pnpm add prisma-ltree`;

const configCode = `// prisma-next.config.ts
import { defineConfig } from "@prisma-next/cli/config-types";
import postgresAdapter from "@prisma-next/adapter-postgres/control";
import sql from "@prisma-next/family-sql/control";
import postgres from "@prisma-next/target-postgres/control";
import ltree from "prisma-ltree/control";

export default defineConfig({
  family: sql,
  target: postgres,
  adapter: postgresAdapter,
  extensionPacks: [ltree],
});`;

const contractCode = `// Add an ltree column to a model
import { int4Column, textColumn } from "@prisma-next/adapter-postgres/column-types";
import { defineContract, field, model } from "@prisma-next/sql-contract-ts/contract-builder";
import { ltree } from "prisma-ltree/column-types";
import ltreePack from "prisma-ltree/pack";

export const contract = defineContract({
  family: sqlFamily,
  target: postgres,
  extensionPacks: { ltree: ltreePack },
  models: {
    Category: model("Category", {
      fields: {
        id: field.column(int4Column).id(),
        name: field.column(textColumn),
        path: field.column(ltree()),
      },
    }).sql({ table: "category" }),
  },
});`;

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 text-xs tracking-widest text-muted-foreground uppercase">{children}</p>;
}

function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16 md:py-24">
      {/* Hero */}
      <header className="border-b border-border pb-12">
        <p className="text-xs tracking-widest text-muted-foreground uppercase">
          Prisma Next extension pack
        </p>
        <h1 className="mt-4 text-4xl font-medium md:text-5xl">prisma-ltree</h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
          PostgreSQL&apos;s{" "}
          <a
            href="https://www.postgresql.org/docs/current/ltree.html"
            className="text-foreground underline underline-offset-4"
          >
            <code>ltree</code>
          </a>{" "}
          hierarchical-tree type for Prisma Next. Model category trees, org charts, taxonomies, and
          filesystem-like paths — then query them with type-safe, prisma-native operators.
          Ancestor/descendant checks, <code>lquery</code>/<code>ltxtquery</code> matching, path
          manipulation, and lowest-common-ancestor — without dropping to raw SQL.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button render={<a href="#setup">Get started</a>} />
          <Button variant="outline" render={<a href={GITHUB_URL}>View on GitHub</a>} />
        </div>
        <div className="mt-8 max-w-md">
          <CodeBlock code={installCode} lang="bash" />
        </div>
      </header>

      {/* Setup */}
      <section id="setup" className="scroll-mt-8 border-b border-border py-12">
        <SectionLabel>Setup</SectionLabel>
        <h2 className="text-2xl font-medium">Three steps to a typed tree</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          The pack ships a baseline migration that runs{" "}
          <code>CREATE EXTENSION IF NOT EXISTS ltree</code> — applied automatically by{" "}
          <code>prisma-next db init</code> / <code>db update</code>. Requires Node{" "}
          <code>&gt;=24</code> and <code>@prisma-next/*@0.14.0</code>.
        </p>

        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-medium">1. Register the pack</h3>
            <p className="mb-3 text-sm text-muted-foreground">
              Add <code>prisma-ltree/control</code> to your config&apos;s extension packs.
            </p>
            <CodeBlock code={configCode} />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-medium">2. Declare an ltree column</h3>
            <p className="mb-3 text-sm text-muted-foreground">
              Use the <code>ltree()</code> helper (or <code>ltreeArray()</code>) in your contract.
            </p>
            <CodeBlock code={contractCode} />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12">
        <SectionLabel>Operations</SectionLabel>
        <h2 className="text-2xl font-medium">Everything ltree, type-safe</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Boolean operators return <code>pg/bool@1</code>; the rest return the codec shown. Each
          operator is verified against real Postgres via PGlite integration tests.
        </p>

        <div className="mt-10 flex flex-col gap-12">
          {features.map((feature) => (
            <article
              key={feature.id}
              id={feature.id}
              className="grid scroll-mt-8 gap-6 md:grid-cols-2"
            >
              <div>
                <h3 className="text-lg font-medium">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.blurb}
                </p>
                <div className="mt-4 overflow-hidden border border-border">
                  <table className="w-full text-xs">
                    <tbody>
                      {feature.ops.map((op) => (
                        <tr key={op.method} className="border-b border-border last:border-0">
                          <td className="px-3 py-2 align-top font-mono whitespace-nowrap">
                            {op.method}
                          </td>
                          <td className="px-3 py-2 align-top font-mono text-muted-foreground">
                            {op.sql}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <CodeBlock code={feature.example} className="self-start" />
            </article>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border pt-8 text-sm text-muted-foreground">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p>
            <code>prisma-ltree</code> · Apache-2.0
          </p>
          <nav className="flex gap-4">
            <a href={GITHUB_URL} className="underline underline-offset-4 hover:text-foreground">
              GitHub
            </a>
            <a
              href="https://www.postgresql.org/docs/current/ltree.html"
              className="underline underline-offset-4 hover:text-foreground"
            >
              ltree docs
            </a>
          </nav>
        </div>
        <p className="mt-4 text-xs">
          A full documentation site is coming. For now, this overview reflects the shipped feature
          surface.
        </p>
        <p className="mt-6 text-xs">
          Made by{" "}
          <a
            href="https://procka.org"
            target="_blank"
            rel="noopener noreferrer"
            className="author-shimmer font-medium underline-offset-4 hover:underline"
          >
            Jason Procka
          </a>
        </p>
      </footer>
    </main>
  );
}
