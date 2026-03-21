import type { NormalizedDocument } from "../core/types";

export interface FormatOptions {
  frontmatter?: boolean;
}

function escapeYamlString(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function buildFrontmatter(doc: NormalizedDocument): string {
  const lines = [
    "---",
    `title: "${escapeYamlString(doc.title)}"`,
    `source_path: "${escapeYamlString(doc.source)}"`,
    `source_type: ${doc.sourceType}`,
  ];

  if (doc.metadata?.conversion_date) {
    lines.push(`conversion_date: ${doc.metadata.conversion_date}`);
  }
  if (doc.metadata?.original_mime_type) {
    lines.push(`original_mime_type: ${doc.metadata.original_mime_type}`);
  }
  if (doc.metadata?.extraction) {
    lines.push(`extraction: ${doc.metadata.extraction}`);
  }
  if (doc.metadata?.extraction_status) {
    lines.push(`extraction_status: ${doc.metadata.extraction_status}`);
  }
  if (doc.metadata?.support_level) {
    lines.push(`support_level: ${doc.metadata.support_level}`);
  }
  if (doc.metadata?.document_id) {
    lines.push(`document_id: ${doc.metadata.document_id}`);
  }
  if (typeof doc.metadata?.fragment_count === "number") {
    lines.push(`fragment_count: ${doc.metadata.fragment_count}`);
  }
  if (typeof doc.metadata?.chunk_count === "number") {
    lines.push(`chunk_count: ${doc.metadata.chunk_count}`);
  }
  if (doc.metadata?.chunking_strategy) {
    lines.push(`chunking_strategy: ${doc.metadata.chunking_strategy}`);
  }
  if (typeof doc.metadata?.provenance_version === "number") {
    lines.push(`provenance_version: ${doc.metadata.provenance_version}`);
  }
  if (typeof doc.metadata?.usefulness_score === "number") {
    lines.push(`usefulness_score: ${doc.metadata.usefulness_score.toFixed(2)}`);
  }
  const warnings = doc.metadata?.doctor_warnings;
  if (Array.isArray(warnings) && warnings.length > 0) {
    lines.push("doctor_warnings:");
    for (const w of warnings as string[]) {
      lines.push(`  - "${escapeYamlString(w)}"`);
    }
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
