import { Link } from "@tanstack/react-router";
import { Markdown } from "@tanstack/markdown/react";

import { highlightMarkdownCode } from "@/lib/highlight";
import type { SiteMarkdownDocument } from "@/lib/docs/markdown";
import { cn } from "@/lib/utils";
import { MdCommentComponent, MdTabPanel } from "./md-components";

interface DocsMarkdownProps {
  document: SiteMarkdownDocument;
  className?: string;
}

function MarkdownLink({
  href,
  children,
  className,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  if (!href) {
    return (
      <a className={className} {...props}>
        {children}
      </a>
    );
  }

  if (href.startsWith("/") && !href.startsWith("//")) {
    return (
      <Link to={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <a href={href} className={className} rel="noreferrer noopener" {...props}>
      {children}
    </a>
  );
}

/**
 * Opt fenced blocks out of Fumadocs `.prose` inline-`code` chrome.
 * Matches how fumadocs-ui `CodeBlock` uses `not-prose` on its figure wrapper.
 */
function MarkdownPre({ className, ...props }: React.HTMLAttributes<HTMLPreElement>) {
  return <pre {...props} className={cn("not-prose", className)} />;
}

function MarkdownFigure({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return <figure {...props} className={cn("not-prose", className)} />;
}

export function DocsMarkdown({ document, className }: DocsMarkdownProps) {
  return (
    <div className={cn("markdown-renderer", className)}>
      <Markdown
        highlighter={highlightMarkdownCode}
        components={{
          a: MarkdownLink,
          pre: MarkdownPre,
          figure: MarkdownFigure,
          "md-comment-component": MdCommentComponent,
          "md-tab-panel": MdTabPanel,
        }}
      >
        {document}
      </Markdown>
    </div>
  );
}
