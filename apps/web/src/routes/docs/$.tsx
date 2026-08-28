import { createFileRoute, notFound } from "@tanstack/react-router";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/layouts/docs/page";

import { DocsMarkdown } from "@/components/markdown/docs-markdown";
import { getDocsPage, getDocsPageTree } from "@/lib/docs/content";
import { baseOptions } from "@/lib/layout.shared";

export const Route = createFileRoute("/docs/$")({
  component: Page,
  loader: ({ params }) => {
    const slugs = params._splat ? params._splat.split("/") : [];
    const page = getDocsPage(slugs);
    if (!page) throw notFound();

    return {
      pageTree: getDocsPageTree(),
      title: page.document.meta.title,
      description: page.document.meta.description,
      document: page.document,
      toc: page.document.headings.map((heading) => ({
        title: heading.text,
        url: `#${heading.id}`,
        depth: heading.level,
      })),
    };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title ?? "Docs"}: prisma-ltree` },
      ...(loaderData?.description
        ? [{ name: "description", content: loaderData.description }]
        : []),
    ],
  }),
});

function Page() {
  const data = Route.useLoaderData();

  return (
    <DocsLayout {...baseOptions()} tree={data.pageTree}>
      <DocsPage toc={data.toc}>
        <DocsTitle>{data.title}</DocsTitle>
        {data.description ? <DocsDescription>{data.description}</DocsDescription> : null}
        <DocsBody>
          <DocsMarkdown document={data.document} />
        </DocsBody>
      </DocsPage>
    </DocsLayout>
  );
}
