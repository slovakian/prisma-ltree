// stacks/github.ts
//
// Deploy once locally to provision CI credentials:
//   alchemy login --profile admin
//   pnpm exec alchemy deploy stacks/github.ts --profile admin
//
// This mints a scoped Cloudflare API token and writes it (plus the
// account ID) to the GitHub repo as Actions secrets. Re-run only when
// rotating credentials or changing permissions.

import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import { CloudflareEnvironment } from "alchemy/Cloudflare";
import * as GitHub from "alchemy/GitHub";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";

const OWNER = "slovakian";
const REPO = "prisma-ltree";

export default Alchemy.Stack(
  "github",
  {
    providers: Layer.mergeAll(Cloudflare.providers(), GitHub.providers()),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const env = yield* CloudflareEnvironment;
    const { accountId } = yield* env;

    const apiToken = yield* Cloudflare.AccountApiToken("CIToken", {
      name: "prisma-ltree-ci-token",
      accountId,
      policies: [
        {
          effect: "allow",
          permissionGroups: [
            "Workers Scripts Write",
            "Workers KV Storage Write",
            "Workers R2 Storage Write",
            "D1 Write",
            "Queues Write",
            "Pages Write",
            "Account Settings Write",
            "Secrets Store Write",
            "Workers Tail Read",
          ],
          resources: {
            [`com.cloudflare.api.account.${accountId}`]: "*",
          },
        },
      ],
    });

    yield* GitHub.Secret("cf-api-token", {
      owner: OWNER,
      repository: REPO,
      name: "CLOUDFLARE_API_TOKEN",
      value: apiToken.value,
    });

    yield* GitHub.Secret("cf-account-id", {
      owner: OWNER,
      repository: REPO,
      name: "CLOUDFLARE_ACCOUNT_ID",
      value: Redacted.make(apiToken.accountId),
    });
  }),
);
