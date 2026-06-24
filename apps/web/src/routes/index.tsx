import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { CodeBlock } from "@/components/code-block";
import { LtreeDemo } from "@/components/home/ltree-demo";
import { InstallCommand } from "@/components/install-command";
import { Button } from "@/components/ui/button";
import { homeCodeBlocks } from "@/lib/home-code-samples";
import { demoCodeBlocks } from "@/lib/ltree-demo-data";

const getHomeHighlights = createServerFn({ method: "GET" }).handler(async () => {
  const { highlightCodeBlocks } = await import("@/lib/shiki.server");
  const setupBlocks = homeCodeBlocks.filter((block) => !block.id.startsWith("feature."));
  return { highlights: await highlightCodeBlocks([...setupBlocks, ...demoCodeBlocks]) };
});

export const Route = createFileRoute("/")({
  loader: () => getHomeHighlights(),
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

const GITHUB_URL = "https://github.com/slovakian/prisma-ltree";

interface Op {
  method: string;
  sql: string;
}

interface Feature {
  id: string;
  title: string;
  blurb: string;
  ops: Op[];
}

const features: Feature[] = [
  {
    id: "hierarchy",
    title: "Hierarchy checks",
    blurb: "Filter by branch or subtree with ancestor and descendant checks.",
    ops: [
      { method: "path.isAncestorOf(rhs)", sql: "ltree @> ltree" },
      { method: "path.isDescendantOf(rhs)", sql: "ltree <@ ltree" },
    ],
  },
  {
    id: "pattern-matching",
    title: "Pattern matching",
    blurb:
      "Match paths with lquery wildcards, multiple lquery patterns, or full-text ltxtquery expressions.",
    ops: [
      { method: "path.matchesLquery(pattern)", sql: "ltree ~ lquery" },
      { method: "path.matchesLqueryArray(patterns)", sql: "ltree ? lquery[]" },
      { method: "path.matchesLtxtquery(query)", sql: "ltree @ ltxtquery" },
    ],
  },
  {
    id: "scalar-functions",
    title: "Scalar functions",
    blurb:
      "Derive depth, slice subpaths, find a label's index, or compute the lowest common ancestor.",
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
  },
  {
    id: "array-first-match",
    title: "Array first-match",
    blurb:
      "Store multiple paths in an ltree[] column, then pick the first match for containment or patterns.",
    ops: [
      { method: "paths.firstAncestorOf(rhs)", sql: "ltree[] ?@> ltree" },
      { method: "paths.firstDescendantOf(rhs)", sql: "ltree[] ?<@ ltree" },
      { method: "paths.firstMatchLquery(pattern)", sql: "ltree[] ?~ lquery" },
      {
        method: "paths.firstMatchLtxtquery(query)",
        sql: "ltree[] ?@ ltxtquery",
      },
    ],
  },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 text-xs tracking-widest text-muted-foreground uppercase">{children}</p>;
}

function Home() {
  const { highlights } = Route.useLoaderData();

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
          hierarchical-tree type for Prisma Next. Model category trees, org charts, and taxonomies,
          then query them with typed operators. No raw SQL.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button render={<a href="/docs/getting-started" />} nativeButton={false}>
            Get started
          </Button>
          <Button variant="outline" render={<a href={GITHUB_URL} />} nativeButton={false}>
            View on GitHub
          </Button>
        </div>
        <div className="mt-8 max-w-md">
          <InstallCommand />
        </div>
      </header>

      {/* Interactive demo */}
      <section className="border-b border-border py-12">
        <SectionLabel>See it work</SectionLabel>
        <h2 className="text-2xl font-medium">A query is a shape over the tree</h2>
        <p className="mt-3 mb-8 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Each operator selects a different slice of the tree. Pick one below to see which nodes
          match, the typed call, and the SQL it runs.
        </p>
        <LtreeDemo codeHighlights={highlights} />
      </section>

      {/* Quickstart */}
      <section id="setup" className="scroll-mt-8 border-b border-border py-12">
        <SectionLabel>Quickstart</SectionLabel>
        <h2 className="text-2xl font-medium">Three steps to your first query</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Requires Node <code>&gt;=24</code> and <code>@prisma-next/*@0.14.0</code>. Full setup in
          the{" "}
          <a href="/docs/getting-started" className="underline underline-offset-4">
            Getting Started guide
          </a>
          .
        </p>

        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-medium">1. Register the pack</h3>
            <p className="mb-3 text-sm text-muted-foreground">
              Add <code>prisma-ltree/control</code> to your config.
            </p>
            <CodeBlock html={highlights.config.html} />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-medium">2. Declare ltree columns</h3>
            <p className="mb-3 text-sm text-muted-foreground">
              Use <code>ltree()</code> in TypeScript or <code>ltree.Ltree()</code> in PSL.{" "}
              <a href="/docs/authoring" className="underline underline-offset-4">
                See both lanes
              </a>
              .
            </p>
            <CodeBlock html={highlights.contract.html} />
          </div>
        </div>

        <div className="mt-8">
          <h3 className="mb-2 text-sm font-medium">3. Query the tree</h3>
          <p className="mb-3 text-sm text-muted-foreground">
            Operators attach to ltree column references in the query builder.
          </p>
          <CodeBlock html={highlights.query.html} />
        </div>
      </section>

      {/* Operations */}
      <section className="py-12">
        <SectionLabel>Operations</SectionLabel>
        <h2 className="text-2xl font-medium">Every ltree operator, type-safe</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Each method maps to a native PostgreSQL operator or function. Full reference in the{" "}
          <a href="/docs" className="underline underline-offset-4">
            docs
          </a>
          .
        </p>

        <div className="mt-8 flex flex-col gap-8">
          {features.map((feature) => (
            <article key={feature.id} id={feature.id} className="scroll-mt-8">
              <h3 className="text-lg font-medium">{feature.title}</h3>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
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
            <a href="/docs" className="underline underline-offset-4 hover:text-foreground">
              Docs
            </a>
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
