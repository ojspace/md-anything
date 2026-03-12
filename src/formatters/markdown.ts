import type { NormalizedDocument } from "../core/types";

export interface FormatOptions {
  frontmatter?: boolean;
}

function buildFrontmatter(doc: NormalizedDocument): string {
  const lines = [
    "---",
    `title: "${doc.title.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`,
    `source: "${doc.source.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`,
    `source_type: ${doc.sourceType}`,
  ];

  if (doc.metadata?.extraction) {
    lines.push(`extraction: ${doc.metadata.extraction}`);
  }
  if (doc.metadata?.extraction_status) {
    lines.push(`extraction_status: ${doc.metadata.extraction_status}`);
  }
  if (doc.metadata?.support_level) {
    lines.push(`support_level: ${doc.metadata.support_level}`);
  }
  if (typeof doc.metadata?.usefulness_score === "number") {
    lines.push(`usefulness_score: ${doc.metadata.usefulness_score.toFixed(2)}`);
  }

  lines.push("---");
  return lines.join("\n");
}

export function formatMarkdown(
  doc: NormalizedDocument,
  options: FormatOptions = {},
): string {
  const parts: string[] = [];

  if (options.frontmatter !== false) {
    parts.push(buildFrontmatter(doc));
    parts.push("");
  }

  parts.push(`# ${doc.title}`);
  parts.push("");

  if (doc.summary) {
    parts.push(`> ${doc.summary}`);
    parts.push("");
  }

  for (const section of doc.sections) {
    if (section.heading) {
      parts.push(`## ${section.heading}`);
      parts.push("");
    }
    parts.push(section.content);
    parts.push("");
  }

  return parts.join("\n").trimEnd() + "\n";
}
