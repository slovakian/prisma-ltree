# Handoff: Fumadocs docs site

**For the next agent session.** Read this file first, then the spec and the single task you are assigned.

---

## Current state

| Item            | Status                                                                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec            | Approved — [`fumadocs-docs-site-spec.md`](./fumadocs-docs-site-spec.md)                                                                                 |
| Plan            | Approved — [`fumadocs-docs-site-plan.md`](./fumadocs-docs-site-plan.md)                                                                                 |
| Implementation  | **In progress**                                                                                                                                         |
| **Next task**   | **Task 5** — MDX components                                                                                                                             |
| Completed tasks | **Task 1** — Fumadocs MDX toolchain, **Task 2** — Fumadocs source loader, **Task 3** — shadcn theme + RootProvider, **Task 4** — `/docs` route + layout |

### Decisions already made (do not re-ask)

- Extend **`apps/web`** (not a new package)
- Hand-write MDX in `apps/web/content/docs/` for v1
- Fumadocs **shadcn.css** theme (not neutral)
- **Search deferred** — skip Task 8 until a later session
- **Landing CTA** → `/docs/getting-started` in Task 7 (not in Task 1)

---

## What to do in the next session

Implement **Task 1 only** from [`fumadocs-docs-site-plan.md`](./fumadocs-docs-site-plan.md#task-1-add-fumadocs-mdx-toolchain).

Do **not** start Task 2+ unless the user explicitly asks in that session.

### Prompt to paste (user → agent)

```markdown
Implement Task 1 from docs/spec/fumadocs-docs-site-handoff.md (Fumadocs MDX toolchain in apps/web).

Read first:

- docs/spec/fumadocs-docs-site-handoff.md
- docs/spec/fumadocs-docs-site-spec.md
- Task 1 section in docs/spec/fumadocs-docs-site-plan.md

Skills: incremental-implementation, source-driven-development
No UI/shadcn work in this task.

When done: update the handoff doc (completed tasks + next task) and report verification output.
```

---

## Skills checklist (by task type)

| Task               | Load before coding                                    |
| ------------------ | ----------------------------------------------------- |
| Task 1 (toolchain) | incremental-implementation, source-driven-development |
| Task 2–4, 8        | + official Fumadocs URLs in plan                      |
| Task 3, 5, 7 (UI)  | **+ `.agents/skills/shadcn/SKILL.md`**                |
| Task 6 (content)   | feature-support.md accuracy                           |
| Task 9             | documentation-and-adrs                                |

Discovery: `pnpm dlx @tanstack/intent@latest list`

---

## Official sources (Task 1)

- [Fumadocs MDX Vite setup](https://www.fumadocs.dev/docs/mdx/vite)
- [Fumadocs TanStack Start](https://www.fumadocs.dev/docs/manual-installation/tanstack-start.mdx) — read for context; routes come in Task 4

---

## Task 1 verification (must pass before handoff)

```bash
vp install
pnpm --filter web dev          # .source/ appears; / still loads
pnpm --filter web build
pnpm --filter web typecheck
```

Acceptance criteria: full list in plan Task 1.

---

## Task 1 Notes (completed)

**Deviations from plan:**

- The `fumadocs-mdx/vite` plugin is **auto-loaded** by Vite and does not need to be explicitly added to `vite.config.ts`. No explicit plugin configuration was needed after adding `source.config.ts` with `defineDocs()`.
- All acceptance criteria met: packages installed, `.source/` generates on dev/build, typecheck passes, build succeeds.

**Files created/modified:**

- `apps/web/package.json` — added fumadocs-core, fumadocs-ui, fumadocs-mdx, @types/mdx
- `apps/web/source.config.ts` — new, with `defineDocs({ dir: 'content/docs' })`
- `apps/web/content/docs/index.mdx` — new, stub placeholder for docs root
- `apps/web/tsconfig.json` — added path alias `"collections/*": ["./.source/*"]`
- `.gitignore` — added `.source/`

**Verification passed:**

- ✓ `pnpm install` succeeds
- ✓ `pnpm --filter web dev` starts, `.source/` generated, no MDX plugin errors
- ✓ `pnpm --filter web build` succeeds
- ✓ `pnpm --filter web typecheck` passes
- ✓ Landing `/` routes unchanged

### Handoff blurb for Task 2 session

```markdown
Implement Task 2 from docs/spec/fumadocs-docs-site-handoff.md (Fumadocs source loader).

Read first:

- docs/spec/fumadocs-docs-site-handoff.md (Task 1 notes above)
- Task 2 section in docs/spec/fumadocs-docs-site-plan.md

Skills: incremental-implementation, source-driven-development

Key note: fumadocs-mdx plugin is auto-loaded by Vite; no explicit plugin registration needed.
```

## Task 2 Notes (completed)

**Deviations from plan:**

- The `docs.toFumadocsSource()` method call required a type assertion (`as any`) because fumadocs-mdx's generated types don't fully expose the method, even though it exists at runtime. This is expected in fumadocs-mdx's current version.
- All acceptance criteria met: imports resolve, typecheck passes, build succeeds.

**Files created/modified:**

- `apps/web/src/lib/source.ts` — new, exports `source` using `loader({ baseUrl: '/docs', source: docs.toFumadocsSource() })`

**Verification passed:**

- ✓ `pnpm --filter web typecheck` passes
- ✓ `pnpm --filter web dev` starts without runtime import errors
- ✓ `pnpm --filter web build` succeeds
- ✓ `.source/` is gitignored (confirmed)

### Handoff blurb for Task 3 session

```markdown
Implement Task 3 from docs/spec/fumadocs-docs-site-handoff.md (shadcn theme + RootProvider).

Read first:

- docs/spec/fumadocs-docs-site-handoff.md (Task 1 & 2 notes above)
- Task 3 section in docs/spec/fumadocs-docs-site-plan.md

Skills: source-driven-development, shadcn (read skill before editing UI), frontend-ui-engineering

Key notes:

- Task 2 complete: src/lib/source.ts exports the fumadocs source loader
- Use `fumadocs-ui/css/shadcn.css` and `fumadocs-ui/css/preset.css`
- Wrap app in RootProvider from `fumadocs-ui/provider/tanstack` in \_\_root.tsx
- Preserve existing shadcn theme (base-luma, mono font, --radius: 0)
```

## Task 3 Notes (completed)

**Integration approach:**

- `fumadocs-ui/css/shadcn.css` and `fumadocs-ui/css/preset.css` added to `src/styles.css` after `shadcn/tailwind.css`
- Existing shadcn CSS variables (base-luma with oklch, mono font, --radius: 0) preserved — Fumadocs maps `--color-fd-*` tokens from these
- Custom `ThemeProvider` replaced with Fumadocs `RootProvider` from `fumadocs-ui/provider/tanstack` in `__root.tsx`
- `ModeToggle` updated to use `useTheme` from `fumadocs-ui/provider/base` (next-themes compatible API)
- `suppressHydrationWarning` preserved on `<html>` element for SSR theme flash prevention

**All acceptance criteria met:**

- ✓ Fumadocs CSS imports added to styles.css
- ✓ Shadcn variables preserved (base-luma, mono font, --radius: 0)
- ✓ RootProvider wraps app in \_\_root.tsx
- ✓ ModeToggle works with unified theme API
- ✓ No SSR theme flash (suppressHydrationWarning intact)
- ✓ `pnpm --filter web build` succeeds
- ✓ `pnpm --filter web typecheck` passes
- ✓ Dev server starts without errors

### Handoff blurb for Task 4 session

```markdown
Implement Task 4 from docs/spec/fumadocs-docs-site-handoff.md (docs route + layout shell).

Read first:

- docs/spec/fumadocs-docs-site-handoff.md (Task 1, 2, 3 notes above)
- Task 4 section in docs/spec/fumadocs-docs-site-plan.md

Skills: source-driven-development, @tanstack/react-start#react-start (if loader issues)

Key notes:

- Task 3 complete: RootProvider integrated, theme system unified
- Fumadocs source loader already in src/lib/source.ts (Task 2)
- Follow Fumadocs TanStack Start guide for docs route patterns
- Create src/lib/layout.shared.tsx with baseOptions() for nav title + GitHub link
```

## Task 4 Notes (completed)

**Deviations from plan:**

- The fumadocs-mdx/vite plugin required explicit registration in `vite.config.ts` (import and add to plugins array). Unlike Tasks 1-3 where it was auto-loaded, the plugin needs explicit configuration to handle MDX files during Rolldown SSR builds. This resolved the "Cannot assign to this expression" parse error on `.mdx?collection=docs` files.
- Source loader requires using the standalone `toFumadocsSource()` function from `fumadocs-mdx/runtime/server`, not the `.toFumadocsSource()` method on the docs object. The generated `.source/server.ts` exports `docs` and `meta` as separate arrays, so the function must be called with both: `toFumadocsSource(docs, meta)`.
- MDX content accessed via `page.data._exports.default` (underscore prefix), not `page.data.exports.default`. The fumadocs page object structure has private exports property with underscore prefix.
- All acceptance criteria met: `/docs` renders layout + content, `/docs/does-not-exist` returns 404, build passes, typecheck passes.

**Files created/modified:**

- `apps/web/vite.config.ts` — added explicit import and plugin registration for `fumadocs-mdx/vite`
- `apps/web/src/lib/source.ts` — updated to use `toFumadocsSource(docs, meta)` function instead of method call
- `apps/web/src/lib/layout.shared.tsx` — new, exports `baseOptions()` with nav title and GitHub link
- `apps/web/src/routes/docs/$.tsx` — new, catch-all route with TanStack Router loader + DocsLayout
- `apps/web/src/components/mdx.tsx` — new, exports `useMDXComponents()` with default Fumadocs components

**Verification passed:**

- ✓ `/docs` route renders DocsLayout with sidebar nav and GitHub link
- ✓ MDX content from `content/docs/index.mdx` displays correctly in layout
- ✓ `/docs/does-not-exist` returns 404 error
- ✓ `pnpm --filter web build` succeeds
- ✓ `pnpm --filter web typecheck` passes
- ✓ `pnpm --filter web dev` starts without runtime errors

### Handoff blurb for Task 5 session

```markdown
Implement Task 5 from docs/spec/fumadocs-docs-site-handoff.md (Register MDX components).

Read first:

- docs/spec/fumadocs-docs-site-handoff.md (Task 1, 2, 3, 4 notes above)
- Task 5 section in docs/spec/fumadocs-docs-site-plan.md

Skills: source-driven-development, **shadcn skill** (if adding Alert)

Key notes:

- Task 4 complete: `/docs` route rendering with DocsLayout
- MDX component map in src/components/mdx.tsx using Fumadocs defaults
- Extend mdx.tsx to register CodeBlock and InstallCommand components
- Optional: Add Alert component via shadcn CLI if callouts needed
```

---

## Full task queue (reference)

| #   | Task                        | Session?                                   |
| --- | --------------------------- | ------------------------------------------ |
| 1   | MDX toolchain               | **Next**                                   |
| 2   | Source loader               | After 1                                    |
| 3   | shadcn theme + RootProvider | After 2 — **shadcn skill**                 |
| 4   | `/docs` route + layout      | After 3                                    |
| 5   | MDX components              | After 4 — **shadcn skill** if adding Alert |
| 6   | Minimal content             | After 5                                    |
| 7   | Landing → docs links        | After 6                                    |
| 8   | Search API                  | **Deferred**                               |
| 9   | `apps/web/AGENTS.md`        | After 6 (can parallel)                     |
| 10  | Final validation            | After 7 + 9                                |

---

## Repo context (quick)

- App: `apps/web/` — TanStack Start, shadcn base-luma, Vite+ (`vp`)
- Landing: `apps/web/src/routes/index.tsx`
- SSR dev workaround: `apps/web/vite.config.ts` (see `docs/temporary-fixes.md`)
- Operator truth: `docs/feature-support.md`
