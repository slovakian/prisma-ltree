#!/usr/bin/env -S node
import { Migration, MigrationCLI } from "@prisma/orm-postgres/migration";
import endContract from "../snapshots/6db18d99f118ef4e7fd359cf8bc472b9335bf3edeeefa8a15ee11eaf7742f9fb/contract.json" with { type: "json" };

export default class M extends Migration {
  override readonly endContractJson = endContract;

  override get operations() {
    return [this.createSchema({ schema: "public" }), this.createExtension({ extension: "ltree" })];
  }
}

void MigrationCLI.run(import.meta.url, M);
