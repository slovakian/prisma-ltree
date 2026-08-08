import { createFileRoute } from "@tanstack/react-router";

import { buildLlmsIndex } from "@/lib/docs/content";

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET() {
        return new Response(buildLlmsIndex(), {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
          },
        });
      },
    },
  },
});
