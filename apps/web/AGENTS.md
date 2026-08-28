# Docs Site Implementation Guide

This file documents the docs site for `apps/web` and guides future agents through extending it.

## Quick Start

Before working on the docs site, read these in order:

1. **This file** — you're here
2. **Spec:** `docs/spec/fumadocs-docs-site-spec.md` — architecture assumptions (layout/theme still apply; content pipeline updated)

## Current Status

**Completed tasks (v1 + content pipeline refresh):**

- ✓ Task 1–7, 9 — original Fumadocs site
- ✓ TanStack Markdown + Highlight — replaced Fumadocs MDX + Shiki
- ✓ SSR-only docs rendering (no `createServerFn` content/highlight path)

**Deferred tasks:**

- Task 8 — Search API (deferred; can be added later)
- Task 10 — Final validation

## Key Documentation

| What                                   | Where                                  | When to Read                           |
| -------------------------------------- | -------------------------------------- | -------------------------------------- |
| Spec & assumptions                     | `docs/spec/fumadocs-docs-site-spec.md` | Understanding the why behind decisions |
| Operator documentation accuracy source | `docs/feature-support.md`              | When adding or updating operator docs  |
| TanStack Markdown                      | https://tanstack.com/markdown/latest   | Parsing/rendering docs markdown        |
| TanStack Highlight                     | https://tanstack.com/highlight/latest  | Code fence highlighting                |
| Fumadocs theme customization           | https://www.fumadocs.dev/docs/ui/theme | Modifying colors, fonts, spacing       |

## Skills & Prerequisites

### Before Touching UI

**Always load the shadcn skill before editing any component:**

```bash
pnpm dlx @tanstack/intent@latest load web#shadcn
```

### Before Starting a New Task

Run the skill check:

```bash
pnpm dlx @tanstack/intent@latest list
```

## Verification Commands

Use these commands before marking any task complete:

```bash
# Format, lint, typecheck
cd apps/web && vp check

# Build check
vp build

# Typecheck only
pnpm typecheck
```

All three must pass before submitting.

## Project Structure

```
apps/web/
  src/
    components/
      markdown/
        docs-markdown.tsx   # TanStack Markdown renderer + components map
        md-components.tsx   # Comment components (tabs, install-command)
      code-block.tsx        # Standalone Highlight code block (landing/demo)
      install-command.tsx
    lib/
      docs/
        content.ts          # Eager markdown loader + page tree
        markdown.ts         # parseDocsMarkdown (docs extensions)
        frontmatter.ts      # title/description frontmatter
      highlight.ts          # TanStack Highlight registry + adapters
      layout.shared.tsx     # Fumadocs nav config (title, links)
    routes/
      __root.tsx            # Root shell (RootProvider wraps app)
      index.tsx             # Landing page (with /docs CTA)
      docs/
        $.tsx               # Docs catch-all route (SSR loader, no server fn)
    styles/
      highlight.css         # Generated Highlight theme CSS
    styles.css
  content/
    docs/                   # Hand-written Markdown docs
      index.md
      getting-started.md
      meta.json             # Sidebar structure
      operations/
        hierarchy.md
        pattern-matching.md
        meta.json
  vite.config.ts
```

## Content Accuracy

### Documenting Operators

All operator documentation must be:

1. **Checked against `docs/feature-support.md`** — only document `supported` status operators
2. **Cross-referenced with the spec** — ensure method signatures match package exports
3. **Include TypeScript examples** — use fenced code blocks with `ts` / `typescript` language

**Never document:**

- `planned` operators (coming in future releases)
- `out-of-scope` operators (outside the extension)
- Operators not in `docs/feature-support.md`

### Adding New Pages

1. Create `.md` file in `content/docs/` with frontmatter:

   ```yaml
   ---
   title: Page Title
   description: Short description for sidebar
   ---
   ```

2. Update or create `meta.json` in parent directory for sidebar ordering:

   ```json
   {
     "title": "Section Title",
     "pages": ["page-a", "page-b"]
   }
   ```

3. Run `vp check --fix` to format new content

4. Verify the page renders at `/docs/path-to-page` without 404

### Custom components in Markdown

TanStack Markdown does not evaluate JSX. Use comment components:

```md
<!-- ::install-command -->

<!-- ::start:tabs -->

## Tab One

…

## Tab Two

…

<!-- ::end:tabs -->
```

Register handlers in `src/components/markdown/md-components.tsx`.

## Common Tasks

### Adding a New Docs Component

1. Create component in `src/components/`
2. Wire it in `md-components.tsx` under the matching `data-component` name
3. Use the comment form in Markdown

### Updating Docs Content

1. Edit `.md` files in `content/docs/`
2. Cross-check operator claims against `docs/feature-support.md`
3. Run `vp check --fix` to auto-format
4. Test in dev: `pnpm --filter web dev` → navigate to `/docs/your-page`
5. Build to verify: `vp build`

### Changing Theme / Styling

1. Load shadcn skill: `pnpm dlx @tanstack/intent@latest load web#shadcn`
2. Use `pnpm dlx shadcn@latest add <component>` to add new shadcn components
3. Modify `src/styles.css` for global CSS changes
4. Highlight themes live in `src/styles/highlight.css` (regenerate from `@tanstack/highlight/theme` when changing themes)
5. Run `vp check` to verify no CSS conflicts

## Navigation Structure

### Landing Page (`/`)

- Primary CTA: "Get started" → `/docs/getting-started`
- Footer: "Docs" link → `/docs`

### Docs Pages (`/docs/*`)

- Navigation:
  - Title: "prisma-ltree" (clickable → `/docs`)
  - Links: "Home" (→ `/`), "GitHub" (external)
- Sidebar: Built from `content/docs/**/meta.json` + page frontmatter
- Shared Fumadocs `RootProvider` theme

### Routing

- `/` — Landing page
- `/docs` — Docs root (renders `content/docs/index.md`)
- `/docs/getting-started` — Get started guide
- `/docs/authoring` — PSL and TypeScript contract authoring
- `/docs/indexes` — GiST indexes on ltree columns
- `/docs/operations/hierarchy` — Hierarchy operators
- `/docs/operations/pattern-matching` — Pattern matching operators
- `/docs/<any>` — Auto-404 if file doesn't exist
- `/docs/<path>.md`, `/llms.txt`, `/llms-full.txt` — raw markdown for agents

## Architecture Notes

- **No content `createServerFn` / RSC path.** Docs load via Vite `import.meta.glob` + the route `loader`, which runs under TanStack Start SSR and hydrates with the same isomorphic Markdown/Highlight modules.
- **Fumadocs UI** still provides `DocsLayout` / `DocsPage` chrome and theming.
- **Highlight** is synchronous and shared between SSR and the browser.

## Troubleshooting

### Docs page 404 after adding a file

**Cause:** Page not listed in the nearest `meta.json`, or wrong filename.

**Fix:** Add the page name (without `.md`) to `pages` in `meta.json`, restart/dev refresh.

### Code blocks unstyled / plaintext only

**Cause:** Language not registered in `src/lib/highlight.ts`.

**Fix:** Import the language from `@tanstack/highlight/languages/*` and add it to `createHighlighter({ languages: [...] })`. Unknown languages fall back to escaped plaintext.

### Theme toggle doesn't affect Fumadocs pages

**Cause:** RootProvider not wrapping children in `__root.tsx`

**Fix:**

1. Verify `RootProvider` from `fumadocs-ui/provider/tanstack` is imported
2. Verify children are wrapped: `<RootProvider>{children}</RootProvider>`

## Next Steps

Deferred work: Task 8 (search API) and Task 10 (final validation). For new docs pages or operator coverage, follow the common tasks above and verify against `docs/feature-support.md`.
