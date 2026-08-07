#!/usr/bin/env node
// Exact-pin guard for external extension authors against published @prisma/orm-* packages.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cwd, exit, stderr } from 'node:process';

const DEP_FIELDS = ['dependencies', 'peerDependencies', 'optionalDependencies'];
const SCOPE = '@prisma/orm-';
const EXACT_VERSION_RE = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;

const pkg = JSON.parse(readFileSync(join(cwd(), 'package.json'), 'utf8'));
const entries = [];
for (const field of DEP_FIELDS) {
  const deps = pkg[field];
  if (!deps || typeof deps !== 'object') continue;
  for (const [name, spec] of Object.entries(deps)) {
    if (!name.startsWith(SCOPE)) continue;
    entries.push({ field, name, spec });
  }
}
const violations = [];
const exact = [];
for (const entry of entries) {
  if (typeof entry.spec === 'string' && EXACT_VERSION_RE.test(entry.spec)) exact.push(entry);
  else violations.push({ ...entry, message: 'not an exact-version pin' });
}
if (exact.length > 1) {
  const versions = new Set(exact.map((e) => e.spec));
  if (versions.size > 1) {
    const observed = [...versions].sort().join(', ');
    for (const entry of exact) {
      violations.push({ ...entry, message: `all @prisma/orm-* entries must share the same exact version (observed: ${observed})` });
    }
  }
}
if (violations.length) {
  stderr.write(`check-pins: ${violations.length} violation(s) in ${pkg.name}\n`);
  for (const v of violations) stderr.write(`  ${v.field}.${v.name} = ${JSON.stringify(v.spec)} — ${v.message}\n`);
  exit(1);
}
