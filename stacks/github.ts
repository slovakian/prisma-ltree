// stacks/github.ts
//
// Deploy once locally to provision CI credentials:
//
//   1. Log in with an admin profile that can mint account API tokens.
//      OAuth / scoped tokens are not enough — use the Global API Key:
//        alchemy login --profile admin
//      (choose API Key + Email at the Cloudflare auth prompt)
//
//   2. Deploy this stack:
//        pnpm exec alchemy deploy stacks/github.ts --profile admin --yes
//
// This mints a scoped Cloudflare API token and writes it (plus the account ID)
// to the GitHub repo as Actions secrets. Re-run only when rotating credentials
// or changing permissions.
//
// If --profile admin fails with "OAuth refresh failed", your admin profile is
// still configured for OAuth in ~/.alchemy/profiles.json. Re-run step 1 or
// switch the admin Cloudflare method to stored API key credentials.

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
      value: Redacted.make(accountId),
    });
  }),
);
