export interface DocsFrontmatter {
  title: string;
  description?: string;
}

/**
 * Minimal YAML frontmatter parser for docs pages (title + description only).
 * TanStack Markdown exposes frontmatter as a raw string.
 */
export function parseDocsFrontmatter(raw: string | undefined): DocsFrontmatter {
  if (!raw?.trim()) {
    return { title: "Untitled" };
  }

  const values: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const match = /^([A-Za-z][\w-]*)\s*:\s*(.*)$/.exec(line.trim());
    if (!match) continue;
    const [, key, value] = match;
    values[key] = stripQuotes(value.trim());
  }

  return {
    title: values.title || "Untitled",
    description: values.description || undefined,
  };
}

function stripQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

/** Split `---` frontmatter from body for LLM / raw markdown responses. */
export function splitFrontmatter(source: string): { frontmatter?: string; body: string } {
  if (!source.startsWith("---")) {
    return { body: source };
  }

  const end = source.indexOf("\n---", 3);
  if (end === -1) {
    return { body: source };
  }

  const frontmatter = source.slice(4, end).trim();
  let body = source.slice(end + 4);
  if (body.startsWith("\n")) body = body.slice(1);
  return { frontmatter, body };
}
