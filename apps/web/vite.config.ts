import { defineConfig } from "vite-plus";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import fumadocsMdx from "fumadocs-mdx/vite";
import { isRunnableDevEnvironment } from "vite-plus";
import type { Plugin } from "vite-plus";
import type { IncomingMessage, ServerResponse } from "node:http";

// The virtual module TanStack Start compiles its SSR handler into. Its default
// export is `{ fetch(request: Request): Promise<Response> }`.
const SERVER_ENTRY = "virtual:tanstack-start-server-entry";

/**
 * Serves TanStack Start's SSR handler in dev under Vite+.
 *
 * ⚠️  TEMPORARY FIX — see ../../docs/temporary-fixes.md#vite--tanstack-start-ssr-dev-server
 *
 * TanStack Start's built-in dev-server plugin only mounts its SSR middleware
 * when `isRunnableDevEnvironment(server.environments.ssr)` is true. Vite+'s SSR
 * environment is fully runnable (its `runner.import` works), but it is created
 * by Vite+'s own environment class, so it fails Vite's `instanceof`-based brand
 * check. The middleware is therefore never mounted and every route falls through
 * to the connect 404 ("Cannot GET /").
 *
 * This plugin reproduces exactly what the upstream plugin does — import the
 * server entry and dispatch the request to its `fetch` — but gates on a duck
 * type instead of `instanceof`. It is a no-op on standard Vite (where the brand
 * check passes and upstream already handles SSR), so it only fills the Vite+ gap.
 */
function tanstackStartViteplusDevSsr(): Plugin {
  return {
    name: "tanstack-start:viteplus-dev-ssr",
    apply: "serve",
    configureServer(server) {
      // Returning a function defers middleware registration until after Vite's
      // internal middlewares, so this stays the last, catch-all handler.
      return () => {
        const ssr = server.environments.ssr;
        const runner = (
          ssr as {
            runner?: {
              import: (
                id: string,
              ) => Promise<{ default: { fetch: (req: Request) => Promise<Response> } }>;
            };
          }
        ).runner;

        // Skip when upstream already handles SSR (standard Vite) or the env
        // cannot run modules.
        if (isRunnableDevEnvironment(ssr) || typeof runner?.import !== "function") {
          return;
        }
        const importServerEntry = runner.import.bind(runner);

        server.middlewares.use(async (req, res) => {
          try {
            const { default: handler } = await importServerEntry(SERVER_ENTRY);
            await sendWebResponse(res, await handler.fetch(toWebRequest(req)));
          } catch (error) {
            server.ssrFixStacktrace(error as Error);
            console.error(error);
            if (!res.headersSent) res.statusCode = 500;
            res.end(error instanceof Error ? (error.stack ?? error.message) : String(error));
          }
        });
      };
    },
  };
}

function toWebRequest(req: IncomingMessage & { originalUrl?: string }): Request {
  const method = req.method ?? "GET";
  const url = `http://${req.headers.host ?? "localhost"}${req.originalUrl ?? req.url ?? "/"}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value]) headers.append(key, item);
  }
  const init: RequestInit & { duplex?: "half" } = { method, headers };
  if (method !== "GET" && method !== "HEAD") {
    init.body = req as unknown as ReadableStream;
    // `duplex` is required by undici when streaming a Node request as the body.
    init.duplex = "half";
  }
  return new Request(url, init);
}

async function sendWebResponse(res: ServerResponse, response: Response): Promise<void> {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  if (response.body) {
    const reader = response.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
  }
  res.end();
}

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    tailwindcss(),
    tanstackStart(),
    fumadocsMdx(),
    viteReact(),
    tanstackStartViteplusDevSsr(),
  ],
  test: {
    passWithNoTests: true,
  },
  server: {
    strictPort: true,
  },
});

export default config;
