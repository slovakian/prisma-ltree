import { source, markdownPathToSlugs } from "@/lib/source";
import { getLLMText } from "@/lib/get-llm-text";

export async function getDocsMarkdownResponse(slugs: string[]) {
  const page = source.getPage(slugs);
  if (!page) return null;

  return new Response(await getLLMText(page), {
    headers: {
      "Content-Type": "text/markdown",
    },
  });
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
