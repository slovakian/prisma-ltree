#!/usr/bin/env -S node
import { Migration, MigrationCLI, col, primaryKey } from "@prisma/orm-target-postgres/target/migration";

export default class M extends Migration {
  override describe() {
    return {
      from: null,
      to: "3598d200521bad542c32c8cdb6d5c2adbe0be4f092857b12dbe5aa2faff59f31",
    };
  }

  override get operations() {
    return [
      this.createTable({
        schema: "public",
        table: "taxon",
        columns: [
          col("common_name", "text", { codecRef: { codecId: "pg/text@1" } }),
          col("extinct", "bool", { notNull: true, codecRef: { codecId: "pg/bool@1" } }),
          col("id", "character(36)", {
            notNull: true,
            codecRef: { codecId: "sql/char@1", typeParams: { length: 36 } },
          }),
          col("ma_extinct", "float8", { codecRef: { codecId: "pg/float8@1" } }),
          col("ma_origin", "float8", { codecRef: { codecId: "pg/float8@1" } }),
          col("path", '"ltree"', {
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
