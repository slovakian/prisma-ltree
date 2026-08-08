import { createMiddleware, createStart } from "@tanstack/react-start";
import { isMarkdownPreferred } from "fumadocs-core/negotiation";

import { docsPathnameToSlugs, getDocsMarkdownText, getDocsPage } from "@/lib/docs/content";

const markdownNegotiation = createMiddleware().server(async ({ next, request }) => {
  if (!isMarkdownPreferred(request)) {
    return next();
  }

  const slugs = docsPathnameToSlugs(new URL(request.url).pathname);
  if (slugs === null) {
    return next();
  }

  const page = getDocsPage(slugs);
  if (!page) {
    return next();
  }

  return new Response(getDocsMarkdownText(page), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
});

export const startInstance = createStart(() => ({
  requestMiddleware: [markdownNegotiation],
}));
