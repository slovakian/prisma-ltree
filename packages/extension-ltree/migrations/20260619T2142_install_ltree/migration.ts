#!/usr/bin/env -S node
import { Migration, MigrationCLI } from "@prisma/orm-target-postgres/target/migration";

export default class M extends Migration {
  override describe() {
    return {
      from: null,
      to: "5842622c2779cd02acd640ab4a5c8979fc94a2af8ed034222391fbd4f7cb3706",
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
