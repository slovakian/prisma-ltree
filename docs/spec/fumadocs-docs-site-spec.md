# Spec: Fumadocs Docs Site for prisma-ltree

**Status:** Approved (2026-06-20), content pipeline updated (2026-08-08)
**Date:** 2026-06-20
**Author:** Agent (spec-driven-development → planning-and-task-breakdown)

> **Content pipeline update (2026-08-08):** Docs content now uses **TanStack Markdown**
> (`content/docs/**/*.md`) and **TanStack Highlight** for code fences. The Fumadocs MDX +
> Shiki + `createServerFn` content path was removed. Docs still use Fumadocs UI
> (`DocsLayout` / `DocsPage` / `RootProvider`) with TanStack Start SSR (no RSC /
> content server-function boundary). See `apps/web/AGENTS.md`.

---

## 1. Objective

Add a **minimal, maintainable documentation site** to the existing TanStack Start app at
`apps/web/`, powered by **Fumadocs** (framework mode) with **MDX** content and **shadcn-native**
theming. The landing page at `/` stays as-is; user-facing docs live under `/docs/*`.

### Who is the user

- **Application developers** evaluating or adopting `prisma-ltree`
- **Agents** implementing or extending the docs site (must follow repo skills, especially
  **shadcn** when touching UI components)

### What success looks like

- `/docs` renders a simple sidebar layout with a small, accurate set of pages
- MDX pages can embed existing site components (`CodeBlock`, `InstallCommand`, future shadcn UI)
- Docs visually match the existing shadcn **base-luma** theme (light/dark, mono typography)
- `vp dev` and `vp run web#build` succeed with Fumadocs MDX + TanStack Start SSR
- Each implementation step is a **standalone agent session** with explicit verification
- Agent-facing docs in `apps/web/` remind implementers to load the **shadcn skill** before UI work

### Why Fumadocs + TanStack Start

Official sources:

- [Fumadocs TanStack Start manual installation](https://www.fumadocs.dev/docs/manual-installation/tanstack-start.mdx)
- [Fumadocs MDX Vite setup](https://www.fumadocs.dev/docs/mdx/vite)
- [Fumadocs UI shadcn theme preset](https://www.fumadocs.dev/docs/ui/theme)

The repo already runs TanStack Start + Tailwind 4 + shadcn in `apps/web/`. Fumadocs adds MDX
collections, docs layout, and search without replacing the existing marketing landing page.

---

## 2. Assumptions

```
ASSUMPTIONS I'M MAKING:
1. Extend apps/web/ — do not create a separate apps/website/ package (CLAUDE.md name is stale).
2. Keep the current landing page at /; docs live at /docs/* only.
3. Initial MDX content is hand-authored in apps/web/content/docs/ (not auto-synced from docs/).
4. Minimal page count (~4–6 pages) is enough for v1; depth comes later.
5. Full-text search (/api/search) is optional for v1 — include only if trivial after core routing works.
6. Fumadocs shadcn.css preset adopts our existing CSS variables from shadcn/tailwind.css.
7. Agents working on UI must load .agents/skills/shadcn/SKILL.md before adding/changing components.
→ Correct me now or we'll proceed with these.
```

---

## 3. Tech Stack

| Concern         | Choice                                                          |
| --------------- | --------------------------------------------------------------- |
| App             | `apps/web` — TanStack Start (existing)                          |
| Toolchain       | Vite+ (`vp dev`, `vp run web#build`)                            |
| Docs framework  | Fumadocs Core + Fumadocs UI (framework mode)                    |
| Content         | Fumadocs MDX (`fumadocs-mdx`, `content/docs/`)                  |
| UI              | shadcn/ui (existing `components.json`, base-luma preset)        |
| Styling         | Tailwind CSS 4 + `fumadocs-ui/css/shadcn.css`                   |
| Theme           | Fumadocs `RootProvider` (TanStack) + existing shadcn CSS tokens |
| Accuracy source | `docs/feature-support.md` for operator/status claims            |

### New dependencies (apps/web)

```
fumadocs-core fumadocs-ui fumadocs-mdx @types/mdx
```

Install via `pnpm add` in `apps/web/` (or workspace catalog if added later).

---

## 4. Commands

From repo root:

| Action                | Command                             |
| --------------------- | ----------------------------------- |
| Install               | `vp install`                        |
| Dev (site + docs)     | `vp dev` or `pnpm --filter web dev` |
| Format/lint/typecheck | `vp check`                          |
| Build                 | `vp run web#build`                  |
| Preview production    | `vp run web#preview`                |

From `apps/web/`:

| Action               | Command                                                                |
| -------------------- | ---------------------------------------------------------------------- |
| Add shadcn component | `pnpm dlx shadcn@latest add <component>` — **load shadcn skill first** |
| shadcn project info  | `pnpm dlx shadcn@latest info --json`                                   |

---

## 5. Project Structure (target)

```
apps/web/
├── content/docs/              # MDX source (Fumadocs collection)
│   ├── meta.json              # Sidebar order / section labels
│   ├── index.mdx              # Docs home / intro
│   ├── getting-started.mdx
│   └── operations/
│       ├── meta.json
│       ├── hierarchy.mdx
│       └── pattern-matching.mdx
├── source.config.ts           # fumadocs-mdx defineDocs()
├── .source/                   # Generated (gitignored) — collections output
├── src/
│   ├── components/
│   │   ├── mdx.tsx            # MDX component map (Fumadocs defaults + custom)
│   │   └── ...                # Existing shadcn + site components
│   ├── lib/
│   │   ├── source.ts          # Fumadocs loader (baseUrl: '/docs')
│   │   └── layout.shared.tsx  # DocsLayout nav/title options
│   └── routes/
│       ├── __root.tsx         # RootProvider + existing shell
│       ├── index.tsx          # Landing (unchanged scope)
│       ├── docs/$.tsx         # Catch-all docs page
│       └── api/search.ts      # Optional Orama search endpoint
├── AGENTS.md                  # Agent rules incl. shadcn skill requirement
└── vite.config.ts             # + fumadocs-mdx/vite plugin
```

Repo-level markdown in `docs/` remains the **maintainer / extension** source of truth.
User-facing docs in `apps/web/content/docs/` should reflect `docs/feature-support.md` but
need not duplicate every ADR or prisma-next architecture doc.

---

## 6. Content Scope (v1 — minimal)

| Route                               | Purpose                                               |
| ----------------------------------- | ----------------------------------------------------- |
| `/docs`                             | What prisma-ltree is, link to GitHub + feature matrix |
| `/docs/getting-started`             | Install, config, contract column, db init             |
| `/docs/operations/hierarchy`        | `isAncestorOf`, `isDescendantOf` + examples           |
| `/docs/operations/pattern-matching` | lquery / lquery[] / ltxtquery + examples              |

**Deferred:** i18n, versioned docs, auto-sync from `docs/`, blog, API reference generator,
playground, full operations catalog (scalar fns, arrays, concat).

Each operations page should include one MDX-embedded component demo (e.g. `<InstallCommand />` on
getting-started, `<CodeBlock />` on operations pages) to prove the MDX pipeline.

---

## 7. Layout & Theming

### Design goals

- **Simple:** default Fumadocs `DocsLayout`, no notebook layout, no layout tabs
- **Native shadcn:** use Fumadocs shadcn preset, not neutral/slate Fumadocs themes
- **Consistent:** same mono font, border radius (`--radius: 0`), and oklch tokens as landing page
- **Lightweight nav:** title "prisma-ltree", links to `/` (home) and GitHub

### CSS integration

Per [Fumadocs theme docs](https://www.fumadocs.dev/docs/ui/theme), add:

```css
@import "fumadocs-ui/css/shadcn.css";
@import "fumadocs-ui/css/preset.css";
```

Keep existing `@import "shadcn/tailwind.css"` and `:root` / `.dark` variable blocks in
`src/styles.css`. Fumadocs maps `--color-fd-*` from shadcn semantic tokens.

### Theme provider strategy

Replace the duplicate theme stack:

| Today                                                 | Target                                                                   |
| ----------------------------------------------------- | ------------------------------------------------------------------------ |
| Custom `ThemeProvider` + `ModeToggle` in `__root.tsx` | Fumadocs `RootProvider` from `fumadocs-ui/provider/tanstack`             |
| `storageKey="theme"` on custom provider               | Align with Fumadocs / next-themes defaults OR configure both to same key |

`ModeToggle` on the landing page should use the same theme API as docs (one source of truth).

---

## 8. MDX Components

`src/components/mdx.tsx` exports `getMDXComponents` per
[Fumadocs TanStack Start guide](https://www.fumadocs.dev/docs/manual-installation/tanstack-start.mdx):

- Spread `defaultMdxComponents` from `fumadocs-ui/mdx`
- Register project components: `CodeBlock`, `InstallCommand`, and shadcn `Alert` / `Badge` as needed

**Rule for agents:** Before adding any shadcn component to MDX or routes, load
`.agents/skills/shadcn/SKILL.md` and run `pnpm dlx shadcn@latest docs <component>` first.

---

## 9. Testing Strategy

| Level   | What                                                          | When                       |
| ------- | ------------------------------------------------------------- | -------------------------- |
| Build   | `vp run web#build` generates `.source/` and production bundle | Every task                 |
| Dev SSR | `vp dev` — hit `/`, `/docs`, `/docs/getting-started`          | Every task touching routes |
| Visual  | Browser check: sidebar, dark mode, MDX code blocks            | After Phase 3              |
| Content | Operator names match `docs/feature-support.md`                | Content tasks              |

No new vitest suite required for v1 unless a task adds a small route loader test.

---

## 10. Boundaries

### Always

- Load **shadcn skill** before adding or modifying shadcn UI
- Follow **source-driven-development** — cite Fumadocs URLs for framework-specific patterns
- Use **incremental-implementation** — one plan task per agent session
- Run `vp check` before marking a task done
- Keep landing page `/` functional after every task

### Ask first

- Adding dependencies outside the Fumadocs/shadcn stack
- Auto-sync pipeline from `docs/` → `content/docs/`
- Removing the Vite+ SSR dev workaround in `vite.config.ts`
- Changing shadcn preset (`components.json` style/baseColor)

### Never

- Hand-copy shadcn component source from GitHub (use CLI per shadcn skill)
- Use Fumadocs `neutral.css` theme (conflicts with shadcn-native goal)
- Duplicate full prisma-next architecture docs in user-facing MDX
- Claim unsupported operators as supported (check `docs/feature-support.md`)

---

## 11. Success Criteria

- [ ] `/docs` and nested routes render with sidebar + MDX body
- [ ] At least one custom component renders inside MDX
- [ ] Light/dark mode works on landing and docs with one theme system
- [ ] `vp run web#build` passes
- [ ] `apps/web/AGENTS.md` documents shadcn skill requirement
- [ ] Implementation plan tasks are each ≤ ~5 files and independently verifiable

---

## 12. Resolved decisions (2026-06-20)

| Question               | Decision                                                             |
| ---------------------- | -------------------------------------------------------------------- |
| Search (`/api/search`) | **Deferred** — not in v1; Task 8 remains in plan for a later session |
| Content sync           | **Hand-write v1 MDX** — no auto-sync from `docs/` yet                |
| Landing CTA            | **Yes** — "Get started" → `/docs/getting-started` (Task 7)           |
| Assumptions (§2)       | **Approved**                                                         |

**Still open:** Vite+ + fumadocs-mdx plugin ordering — validate during Task 1 spike.

---

## 13. Skills Map (for agents)

| Phase                      | Skill                             | Purpose                          |
| -------------------------- | --------------------------------- | -------------------------------- |
| Plan (this doc)            | spec-driven-development           | Requirements before code         |
| Plan (tasks doc)           | planning-and-task-breakdown       | Session-sized tasks              |
| Each task                  | incremental-implementation        | One vertical slice               |
| Fumadocs/TanStack patterns | source-driven-development         | Official doc verification        |
| UI / MDX components        | shadcn                            | CLI, composition, styling rules  |
| TanStack Start routing     | @tanstack/react-start#react-start | Load via intent if stuck         |
| Pre-merge                  | code-review-and-quality           | Review slice                     |
| Ship                       | shipping-and-launch               | Deploy checklist (if applicable) |

Skill discovery command: `pnpm dlx @tanstack/intent@latest list`
