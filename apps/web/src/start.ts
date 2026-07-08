import { createMiddleware, createStart } from "@tanstack/react-start";
import { isMarkdownPreferred } from "fumadocs-core/negotiation";
import { docsPathnameToSlugs, getDocsMarkdownResponse } from "@/lib/docs-markdown";

const markdownNegotiation = createMiddleware().server(async ({ next, request }) => {
  if (!isMarkdownPreferred(request)) {
    return next();
  }

  const slugs = docsPathnameToSlugs(new URL(request.url).pathname);
  if (slugs === null) {
    return next();
  }

  const response = await getDocsMarkdownResponse(slugs);
  if (!response) {
    return next();
  }

  return response;
});

export const startInstance = createStart(() => ({
  requestMiddleware: [markdownNegotiation],
}));
