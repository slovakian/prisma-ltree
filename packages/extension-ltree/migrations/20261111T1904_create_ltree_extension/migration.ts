#!/usr/bin/env -S node
import { Migration, MigrationCLI } from "@prisma/orm-postgres/migration";
import endContract from "../snapshots/150f76958e7b1802cb3fb17b2792759d19e6aedf01f5fffa5f77565a2afe4582/contract.json" with { type: "json" };

export default class M extends Migration {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: "public" }),
      this.createExtension({ schema: "public", extension: "ltree" }),
    ];
  }
}

void MigrationCLI.run(import.meta.url, M);
