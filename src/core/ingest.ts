import { readdir, stat, mkdir } from "node:fs/promises";
import { join, basename, extname } from "node:path";
import type { IngestOptions, IngestDoc, IngestResult, InputKind } from "./types";
import type { RuntimeProviders } from "./runtime";
import { detectInputKind } from "./detect-input";
import { routeInput } from "./route-input";
import { finalizeDocument } from "./finalize-document";
import { isSourceManifest } from "./is-source-manifest";
import { readSourceManifest } from "./source-manifest";

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
  let converted = 0;
  let skipped = 0;
  let failed = 0;
  const outputFiles: string[] = [];

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

    if (isSourceManifest(filePath)) {
      let sources: string[] = [];
      try {
        sources = await readSourceManifest(filePath);
      } catch {
        skipped++;
        continue;
      }

      for (const source of sources) {
        const sourceKind = detectInputKind(source);
        if (!SUPPORTED_KINDS.has(sourceKind)) {
          skipped++;
          continue;
        }

        try {
          const normalized = finalizeDocument(
            await routeInput(sourceKind, source, DEFAULT_OPTIONS, runtime),
          );

          docs.push({
            fileName: sanitizeOutputName(source, sourceKind),
            title: normalized.title,
            source: normalized.source,
            sourceType: normalized.sourceType,
            summary: normalized.summary,
            sections: normalized.sections,
            metadata: normalized.metadata,
            graph: { entities: [], relations: [], relatedNotes: [] },
          });
          converted++;
        } catch {
          failed++;
        }
      }
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

      docs.push({
        fileName: sanitizeOutputName(filePath, kind),
        title: normalized.title,
        source: normalized.source,
        sourceType: normalized.sourceType,
        summary: normalized.summary,
        sections: normalized.sections,
        metadata: normalized.metadata,
        graph: { entities: [], relations: [], relatedNotes: [] },
      });
      converted++;
    } catch {
      failed++;
    }
  }

  return { converted, skipped, failed, outputFiles, docs };
}
