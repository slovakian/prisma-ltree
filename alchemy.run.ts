// alchemy.run.ts
import * as Cloudflare from "@alchemy.run/cloudflare";
import * as GitHub from "@alchemy.run/github";
import * as Alchemy from "alchemy";
import { Stage } from "alchemy";
import * as Output from "alchemy/Output";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { Path } from "effect/Path";

const DOCS_DOMAIN = "prisma-ltree.procka.org";

export default Alchemy.Stack(
  "PrismaLtreeDocs",
  {
    providers: Layer.mergeAll(Cloudflare.providers(), GitHub.providers()),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const path = yield* Path;
    const stage = yield* Stage;

    const docs = yield* Cloudflare.Website.Vite("Docs", {
      rootDir: path.resolve(import.meta.dirname, "apps/web"),
      domain: stage === "prod" ? DOCS_DOMAIN : undefined,
      compatibility: {
        flags: ["nodejs_compat"],
      },
    });

    if (process.env.PULL_REQUEST) {
      yield* GitHub.Comment("preview-comment", {
        owner: "slovakian",
        repository: "prisma-ltree",
        issueNumber: Number(process.env.PULL_REQUEST),
        body: Output.interpolate`
          ## Preview Deployed

          **URL:** ${docs.url}

          Built from commit ${process.env.GITHUB_SHA?.slice(0, 7)}

          ---
          _This comment updates automatically with each push._
        `,
      });
    }

    return {
      url: docs.url.as<string>(),
    };
  }),
);
