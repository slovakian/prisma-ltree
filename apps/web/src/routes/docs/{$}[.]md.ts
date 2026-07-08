import { createFileRoute, notFound } from "@tanstack/react-router";
import { markdownPathToSlugs } from "@/lib/source";
import { getDocsMarkdownResponse } from "@/lib/docs-markdown";

export const Route = createFileRoute("/docs/{$}.md")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const slugs = markdownPathToSlugs(params._splat?.split("/") ?? []);
        const response = await getDocsMarkdownResponse(slugs);
        if (!response) throw notFound();

        return response;
      },
    },
  },
});
