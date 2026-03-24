import { readdir, stat } from "node:fs/promises";
import { join, basename, extname, parse } from "node:path";
import type { IngestOptions, IngestDoc, IngestResult, InputKind } from "./types";
import type { RuntimeProviders } from "./runtime";
import { detectInputKind } from "./detect-input";
import { routeInput } from "./route-input";
import { finalizeDocument } from "./finalize-document";
import { attachDocumentChunks } from "./chunks";
import { INPUT_SUPPORT_LEVELS } from "./support-levels";

const SUPPORTED_KINDS = new Set<InputKind>([
  "text",
  "markdown",
  "json",
  "html",
  "url",
  "youtube",
  "image",
  "pdf",
  "epub",
  "mobi",
  "audio",
  "video",
]);

function sanitizeOutputName(input: string, kind: string): string {
  if (input.startsWith("http://") || input.startsWith("https://")) {
    try {
      const url = new URL(input);
      const slug = `${url.hostname}${url.pathname}`
        .replace(/[^\w]+/g, "-")
        .replace(/^-+|-+$/g, "");
      return `${slug || kind}.md`;
    } catch {
      return `${kind}.md`;
    }
  }
  return `${basename(input, extname(input))}.md`;
}

function reserveUniqueOutputName(candidate: string, usedNames: Set<string>): string {
  if (!usedNames.has(candidate)) {
    usedNames.add(candidate);
    return candidate;
  }

  const parsed = parse(candidate);
  let suffix = 2;
  let nextCandidate = `${parsed.name}-${suffix}${parsed.ext}`;

  while (usedNames.has(nextCandidate)) {
    suffix += 1;
    nextCandidate = `${parsed.name}-${suffix}${parsed.ext}`;
  }

  usedNames.add(nextCandidate);
  return nextCandidate;
}

const DEFAULT_OPTIONS = {
  mode: "balanced" as const,
  summary: true,
  frontmatter: true,
  timestamps: true,
  speakers: false,
  tables: true,
};

export async function ingestFolder(
  folderPath: string,
  runtime: RuntimeProviders,
  options: IngestOptions = {},
): Promise<IngestResult> {
  const docs: IngestDoc[] = [];
  const usedOutputNames = new Set<string>();
  let converted = 0;
  let skipped = 0;
  let failed = 0;

  const entries = await readdir(folderPath, { recursive: options.recursive });
  const filePaths = entries.map((e) => join(folderPath, e as string));

  for (const filePath of filePaths) {
    try {
      const s = await stat(filePath);
      if (!s.isFile()) continue;
    } catch {
      skipped++;
      continue;
    }

    const kind = detectInputKind(filePath);
    if (!SUPPORTED_KINDS.has(kind)) {
      skipped++;
      continue;
    }

    try {
      const normalized = finalizeDocument(
        await routeInput(kind, filePath, DEFAULT_OPTIONS, runtime),
      );
      const doc = attachDocumentChunks({
        ...normalized,
        metadata: {
          ...normalized.metadata,
          support_level: INPUT_SUPPORT_LEVELS[kind],
        },
      });

      docs.push({
        fileName: reserveUniqueOutputName(sanitizeOutputName(filePath, kind), usedOutputNames),
        title: doc.title,
        source: doc.source,
        sourceType: doc.sourceType,
        summary: doc.summary,
        sections: doc.sections,
        chunks: doc.chunks,
        metadata: doc.metadata,
        provenance: doc.provenance,
      });
      converted++;
    } catch {
      failed++;
    }
  }

  return { converted, skipped, failed, outputFiles: [], docs };
}
