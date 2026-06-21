import { createFileRoute } from "@tanstack/react-router";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { source } from "@/lib/source";
import { baseOptions } from "@/lib/layout.shared";
import { useMDXComponents } from "@/components/mdx";

export const Route = createFileRoute("/docs/$")({
  loader: ({ params }) => {
    const slug = params._splat || "";
    const page = source.getPage(slug ? slug.split("/") : []);
    if (!page) {
      throw new Error("404");
    }
    return page;
  },
  component: DocsPage,
  notFoundComponent: () => <div className="p-4">Page not found</div>,
});

function DocsPage() {
  const page = Route.useLoaderData() as any;
  const mdxComponents = useMDXComponents();

  const MDXContent = page?.data?._exports?.default;

  return (
    <DocsLayout {...baseOptions()} tree={source.pageTree}>
      {MDXContent ? (
        <MDXContent components={mdxComponents} />
      ) : (
        <div className="p-4">Content not found</div>
      )}
    </DocsLayout>
  );
}
