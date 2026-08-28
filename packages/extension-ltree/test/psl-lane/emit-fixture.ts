/// <reference types="node" />
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { executeContractEmit } from "@prisma/orm-toolchain/cli/control-api";
import { loadConfig } from "@prisma/orm-toolchain/config-loader";

/**
 * Load a fixture `prisma.config.ts` and emit into a temp directory.
 *
 * `executeContractEmit` (8.0.0-rc.2+) takes an already-loaded config; callers
 * own loading via `loadConfig`.
 */
export async function emitFixture(
  fixtureDir: string,
  configFile: string,
  tmpPrefix: string,
  tmpDirs: string[],
): Promise<Record<string, unknown>> {
  const out = await mkdtemp(join(tmpdir(), tmpPrefix));
  tmpDirs.push(out);
  const configPath = join(fixtureDir, configFile);
  const loaded = await loadConfig(configPath, { cwd: fixtureDir });
  if (!loaded.ok) {
    throw loaded.failure;
  }
  await executeContractEmit({
    config: loaded.value.config,
    cwd: fixtureDir,
    configPath,
    outputPath: out,
  });
  return JSON.parse(await readFile(join(out, "contract.json"), "utf-8")) as Record<string, unknown>;
}
