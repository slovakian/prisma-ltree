import { createFileRoute, notFound } from "@tanstack/react-router";

import { getDocsMarkdownText, getDocsPage, markdownPathToSlugs } from "@/lib/docs/content";

export const Route = createFileRoute("/docs/{$}.md")({
  server: {
    handlers: {
      GET: ({ params }) => {
        const slugs = markdownPathToSlugs(params._splat?.split("/") ?? []);
        const page = getDocsPage(slugs);
        if (!page) throw notFound();

        return new Response(getDocsMarkdownText(page), {
          headers: {
            "Content-Type": "text/markdown; charset=utf-8",
          },
        });
      },
    },
  },
});
