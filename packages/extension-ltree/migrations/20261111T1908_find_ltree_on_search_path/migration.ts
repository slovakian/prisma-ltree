#!/usr/bin/env -S node
import { Migration, MigrationCLI } from "@prisma/orm-postgres/migration";
import endContract from "../snapshots/6db18d99f118ef4e7fd359cf8bc472b9335bf3edeeefa8a15ee11eaf7742f9fb/contract.json" with { type: "json" };
import startContract from "../snapshots/150f76958e7b1802cb3fb17b2792759d19e6aedf01f5fffa5f77565a2afe4582/contract.json" with { type: "json" };

export default class M extends Migration {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [];
  }
}

void MigrationCLI.run(import.meta.url, M);
