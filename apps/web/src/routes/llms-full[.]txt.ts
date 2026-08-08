import { createFileRoute } from "@tanstack/react-router";

import { getDocsMarkdownText, getDocsPages } from "@/lib/docs/content";

export const Route = createFileRoute("/llms-full.txt")({
  server: {
    handlers: {
      GET() {
        const body = getDocsPages()
          .map((page) => getDocsMarkdownText(page))
          .join("\n\n");

        return new Response(body, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
          },
        });
      },
    },
  },
});
