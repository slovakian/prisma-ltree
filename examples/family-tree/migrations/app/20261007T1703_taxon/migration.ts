#!/usr/bin/env -S node
import type { Contract as End } from "../../snapshots/fae0c94c760d88923664ac8fd0fb3730bc6402f7703718c8daa707b2f123b788/contract";
import endContract from "../../snapshots/fae0c94c760d88923664ac8fd0fb3730bc6402f7703718c8daa707b2f123b788/contract.json" with { type: "json" };
import { Migration, MigrationCLI, col, primaryKey } from "@prisma/orm-postgres/migration";

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: "public" }),
      this.createTable({
        schema: "public",
        table: "taxon",
        columns: [
          col("common_name", "text", { codecRef: { codecId: "pg/text@1" } }),
          col("extinct", "bool", { notNull: true, codecRef: { codecId: "pg/bool@1" } }),
          col("id", "text", { notNull: true, codecRef: { codecId: "pg/text@1" } }),
          col("ma_extinct", "float8", { codecRef: { codecId: "pg/float8@1" } }),
          col("ma_origin", "float8", { codecRef: { codecId: "pg/float8@1" } }),
          col("path", "ltree", {
            notNull: true,
            codecRef: { codecId: "pg/ltree@1", typeParams: {} },
          }),
          col("rank", "text", { notNull: true, codecRef: { codecId: "pg/text@1" } }),
          col("scientific_name", "text", { notNull: true, codecRef: { codecId: "pg/text@1" } }),
          col("thumbnail_url", "text", { codecRef: { codecId: "pg/text@1" } }),
          col("wiki_url", "text", { notNull: true, codecRef: { codecId: "pg/text@1" } }),
        ],
        constraints: [primaryKey(["id"])],
      }),
      this.addUnique({
        schema: "public",
        table: "taxon",
        constraint: "taxon_path_key",
        columns: ["path"],
      }),
    ];
  }
}

void MigrationCLI.run(import.meta.url, M);
