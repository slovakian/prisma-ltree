import type * as PageTree from "fumadocs-core/page-tree";

import { parseDocsMarkdown, type SiteMarkdownDocument } from "./markdown";
import { splitFrontmatter } from "./frontmatter";

interface DocsMeta {
  title?: string;
  pages?: string[];
}

export interface DocsPage {
  slugs: string[];
  url: string;
  path: string;
  source: string;
  document: SiteMarkdownDocument;
}

const rawModules = import.meta.glob("../../../content/docs/**/*.{md,json}", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

function normalizeKey(key: string): string {
  return key.replace(/^\.\.\/\.\.\/\.\.\/content\/docs\//, "").replace(/^\.\//, "");
}

const files = new Map<string, string>();
for (const [key, value] of Object.entries(rawModules)) {
  files.set(normalizeKey(key), value);
}

function readMeta(dir: string): DocsMeta {
  const path = dir ? `${dir}/meta.json` : "meta.json";
  const raw = files.get(path);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as DocsMeta;
  } catch {
    return {};
  }
}

function pageFilePath(dir: string, name: string): string | undefined {
  const base = dir ? `${dir}/${name}` : name;
  if (files.has(`${base}.md`)) return `${base}.md`;
  return undefined;
}

function slugsFromPath(path: string): string[] {
  const withoutExt = path.replace(/\.md$/, "");
  const parts = withoutExt.split("/").filter(Boolean);
  if (parts.length === 1 && parts[0] === "index") return [];
  if (parts.at(-1) === "index") return parts.slice(0, -1);
  return parts;
}

function urlFromSlugs(slugs: string[]): string {
  return slugs.length === 0 ? "/docs" : `/docs/${slugs.join("/")}`;
}

function loadPage(path: string): DocsPage {
  const source = files.get(path);
  if (!source) {
    throw new Error(`Missing docs page: ${path}`);
  }
  const slugs = slugsFromPath(path);
  return {
    slugs,
    url: urlFromSlugs(slugs),
    path,
    source,
    document: parseDocsMarkdown(source),
  };
}

const pagesBySlugKey = new Map<string, DocsPage>();

function slugKey(slugs: string[]): string {
  return slugs.join("/");
}

function collectPages(dir: string, meta: DocsMeta): PageTree.Node[] {
  const nodes: PageTree.Node[] = [];
  const pages = meta.pages ?? [];

  for (const entry of pages) {
    if (entry === "---") {
      nodes.push({ type: "separator", name: "" });
      continue;
    }

    const childDir = dir ? `${dir}/${entry}` : entry;
    const childMetaPath = `${childDir}/meta.json`;

    if (files.has(childMetaPath)) {
      const childMeta = readMeta(childDir);
      const indexPath = pageFilePath(childDir, "index");
      const folderChildren = collectPages(childDir, childMeta);
      const folder: PageTree.Folder = {
        type: "folder",
        name: childMeta.title ?? entry,
        children: folderChildren,
        defaultOpen: true,
      };
      if (indexPath) {
        const indexPage = loadPage(indexPath);
        pagesBySlugKey.set(slugKey(indexPage.slugs), indexPage);
        folder.index = {
          type: "page",
          name: indexPage.document.meta.title,
          url: indexPage.url,
        };
      }
      nodes.push(folder);
      continue;
    }

    const filePath = pageFilePath(dir, entry);
    if (!filePath) continue;

    const page = loadPage(filePath);
    pagesBySlugKey.set(slugKey(page.slugs), page);
    nodes.push({
      type: "page",
      name: page.document.meta.title,
      url: page.url,
    });
  }

  return nodes;
}

const rootMeta = readMeta("");
const pageTree: PageTree.Root = {
  name: rootMeta.title ?? "prisma-ltree",
  children: collectPages("", rootMeta),
};

// Ensure every .md file is addressable even if omitted from meta.json
for (const path of files.keys()) {
  if (!path.endsWith(".md")) continue;
  const page = loadPage(path);
  if (!pagesBySlugKey.has(slugKey(page.slugs))) {
    pagesBySlugKey.set(slugKey(page.slugs), page);
  }
}

export function getDocsPageTree(): PageTree.Root {
  return pageTree;
}

export function getDocsPage(slugs: string[]): DocsPage | undefined {
  return pagesBySlugKey.get(slugKey(slugs));
}

export function getDocsPages(): DocsPage[] {
  return [...pagesBySlugKey.values()].sort((a, b) => a.url.localeCompare(b.url));
}

export function markdownPathToSlugs(segs: string[]): string[] {
  if (segs.length === 0) return [];
  const out = [...segs];
  out[out.length - 1] = out[out.length - 1].replace(/\.md$/, "");
  if (out.length === 1 && out[0] === "index") out.pop();
  return out;
}

export function docsPathnameToSlugs(pathname: string): string[] | null {
  if (pathname === "/docs" || pathname === "/docs/") return [];

  const prefix = "/docs/";
  if (!pathname.startsWith(prefix)) return null;

  const rest = pathname.slice(prefix.length);
  if (!rest) return [];

  if (rest.endsWith(".md")) {
    return markdownPathToSlugs(rest.split("/"));
  }

  return rest.split("/").filter(Boolean);
}

export function slugsToMarkdownPath(slugs: string[]) {
  const segments = [...slugs];
  if (segments.length === 0) {
    segments.push("index.md");
  } else {
    segments[segments.length - 1] += ".md";
  }
  return {
    segments,
    url: `/docs/${segments.join("/")}`,
  };
}

export function getDocsMarkdownText(page: DocsPage): string {
  const { body } = splitFrontmatter(page.source);
  return `# ${page.document.meta.title} (${page.url})

${body.trim()}`;
}

export function buildLlmsIndex(): string {
  const lines = ["# prisma-ltree", "", "## Docs", ""];
  for (const page of getDocsPages()) {
    const description = page.document.meta.description ? `: ${page.document.meta.description}` : "";
    lines.push(`- [${page.document.meta.title}](${page.url}.md)${description}`);
  }
  return `${lines.join("\n")}\n`;
}
