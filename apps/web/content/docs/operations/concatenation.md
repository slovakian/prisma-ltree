---
title: Concatenation and conversion
description: Append labels, join paths, and convert between ltree and text
---

Concatenation builds new `ltree` values from paths and labels. Conversion turns an `ltree` into text, or a text column into `ltree`. These methods return `ltree` or `text`; they do not filter rows by themselves.

```typescript
import { db } from "../prisma/db";
```

## concat()

Joins two `ltree` paths (`ltree || ltree`).

```typescript
const rows = await db.orm.Category.select("id", {
  child: (c) => c.path.concat("laptops.gaming"),
}).all();
```

**SQL equivalent:** `path || $1::ltree`

## concatText()

Appends one text label to the path (`ltree || text`).

```typescript
const rows = await db.orm.Category.select("id", {
  child: (c) => c.path.concatText("laptops"),
}).all();
```

**SQL equivalent:** `path || ($1)::text`

## prependText()

Prefixes a text label onto the path. Call it on the **ltree** column even though SQL is `text || ltree`.

```typescript
const rows = await db.orm.Category.select("id", {
  rooted: (c) => c.path.prependText("shop"),
}).all();
```

**SQL equivalent:** `($1)::text || path`

## toText()

Converts the path to plain text (`ltree2text`).

```typescript
const rows = await db.orm.Category.select("id", {
  asText: (c) => c.path.toText(),
}).all();
```

**SQL equivalent:** `ltree2text(path)`

## toLtree()

Converts a **text** column to `ltree` (`text2ltree`). Call it on the text field, not on an ltree column.

```typescript
const rows = await db.orm.ImportRow.select("id", {
  path: (r) => r.rawPath.toLtree(),
}).all();
```

**SQL equivalent:** `text2ltree(raw_path)`

A self-less constructor like `Ltree.fromText(...)` is not available yet. Use `text.toLtree()` on a text column or expression.

## Building a child path on insert

Read the parent path, append a label in application code (or project `concatText` in a select), then insert the string. The codec validates labels on encode.
