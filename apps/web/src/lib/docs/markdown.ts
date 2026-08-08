import { docsMarkdownExtensions } from "@tanstack/markdown/extensions/docs";
import { parseMarkdown } from "@tanstack/markdown/parser";
import type { MarkdownDocument, MarkdownHeading } from "@tanstack/markdown";

import { parseDocsFrontmatter, type DocsFrontmatter } from "./frontmatter";

export type { MarkdownDocument, MarkdownHeading };

export type SiteMarkdownDocument = MarkdownDocument & {
  headings: MarkdownHeading[];
  meta: DocsFrontmatter;
};

const docsExtensions = docsMarkdownExtensions();

export function parseDocsMarkdown(source: string): SiteMarkdownDocument {
  const document = parseMarkdown(source, {
    extensions: docsExtensions,
    frontmatter: true,
    headingIds: true,
  });

  return {
    ...document,
    headings: document.headings ?? [],
    meta: parseDocsFrontmatter(document.frontmatter),
  };
}
