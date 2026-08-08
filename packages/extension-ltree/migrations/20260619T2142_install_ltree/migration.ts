#!/usr/bin/env -S node
import { Migration, MigrationCLI } from "@prisma/orm-target-postgres/target/migration";

export default class M extends Migration {
  override describe() {
    return {
      from: null,
      to: "ca70941530ea2af306b38e95be66ab1deac79357bcfafb48302d07c8f2c9aa92",
    };
  }

  override get operations() {
    return [
      this.installExtension({
        id: "ltree.install-ltree-extension",
        extensionName: "ltree",
        invariantId: "ltree:install-ltree-v1",
      }),
    ];
  }
}

void MigrationCLI.run(import.meta.url, M);
