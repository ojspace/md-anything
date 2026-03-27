import { readFile, stat } from "node:fs/promises";
import { basename } from "node:path";
import { spawnSync } from "node:child_process";
import type { NormalizedDocument, Section } from "../core/types";
import { splitIntoSections } from "../utils/split-sections";

// --- unpdf extraction (zero-dep, primary path) ---

async function extractViaUnpdf(filePath: string): Promise<{ pages: string[]; info: Record<string, unknown> } | null> {
  try {
    const { extractText, getMeta } = await import("unpdf");
    // Buffer extends Uint8Array, so it satisfies unpdf's TypedArray parameter directly
    const data = await readFile(filePath);

    const [textResult, metaResult] = await Promise.all([
      extractText(data, { mergePages: false }),
      getMeta(data).catch(() => ({ info: {}, metadata: null })),
    ]);

    const typed = textResult as { totalPages: number; text?: string[] };
    if (!Array.isArray(typed.text)) return null;

    return {
      pages: typed.text,
      info: (metaResult as { info: Record<string, unknown> }).info ?? {},
    };
  } catch {
    return null;
  }
}

// --- pdftotext extraction (enhanced fallback) ---

async function extractViaPdftotext(filePath: string): Promise<string | null> {
  try {
    const result = spawnSync("pdftotext", [filePath, "-"], {
      encoding: "utf-8",
      timeout: 30000,
      stdio: ["ignore", "pipe", "ignore"],
    });
    if (result.error || result.status !== 0) return null;
    return result.stdout.trim() || null;
  } catch {
    return null;
  }
}

// --- Structure detection for raw text blocks ---

/**
 * Detect heading-like lines in raw text using ALL-CAPS and numbered patterns.
 * Used when page text contains no Markdown structure.
 */
function detectStructure(rawText: string): Section[] {
  const blocks = rawText.split(/\n{2,}/);

  if (blocks.length <= 1) {
    return [{ content: rawText.trim() }];
  }

  const sections: Section[] = [];
  let pendingHeading: string | undefined;

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    const lines = trimmed.split("\n");
    const firstLine = lines[0].trim();

    // Heuristic: short ALL-CAPS line or numbered section header → treat as heading
    const isHeading =
      lines.length === 1 &&
      firstLine.length < 80 &&
      (/^[0-9]+[\.\)]\s/.test(firstLine) || // "1. Title" or "1) Title"
        /^[A-Z][A-Z\s\d\-:]{4,}$/.test(firstLine)); // ALL-CAPS heading

    if (isHeading) {
      // Consecutive headings: merge into one compound heading rather than silently dropping the first
      pendingHeading = pendingHeading ? `${pendingHeading} — ${firstLine}` : firstLine;
    } else {
      sections.push({
        heading: pendingHeading,
        content: trimmed,
        ...(pendingHeading ? { provenance: { headingPath: [pendingHeading] } } : {}),
      });
      pendingHeading = undefined;
    }
  }

  // Dangling heading with no content is dropped
  return sections.filter((s) => s.content.length > 0);
}

// --- Header/footer stripping ---

/**
 * Detects lines that appear verbatim across many pages (running headers/footers)
 * and removes them. Only applied when there are enough pages to detect the pattern.
 */
function stripRunningHeadersFooters(pages: string[]): string[] {
  const nonEmpty = pages.filter((p) => p.trim().length > 0);
  if (nonEmpty.length < 4) return pages;

  // Count how many pages each trimmed line appears on (deduplicated per page)
  const lineFreq = new Map<string, number>();
  for (const page of nonEmpty) {
    const seen = new Set(
      page
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 3 && l.length < 120),
    );
    for (const line of seen) {
      lineFreq.set(line, (lineFreq.get(line) ?? 0) + 1);
    }
  }

  // Lines on ≥60% of pages are likely boilerplate
  const threshold = Math.ceil(nonEmpty.length * 0.6);
  const boilerplate = new Set(
    [...lineFreq.entries()].filter(([, count]) => count >= threshold).map(([line]) => line),
  );

  if (boilerplate.size === 0) return pages;

  return pages.map((page) =>
    page
      .split("\n")
      .filter((line) => !boilerplate.has(line.trim()))
      .join("\n"),
  );
}

// --- Main converter ---

export async function convertPdf(
  filePath: string,
  hasPdftotext = false,
  hasTesseract = false,
): Promise<NormalizedDocument> {
  const name = basename(filePath);
  let fileSize = 0;

  try {
    const s = await stat(filePath);
    fileSize = s.size;
  } catch {
    // ignore
  }

  let sections: Section[] = [];
  let extractionMode = "unavailable";
  let extractionStatus = "weak";
  let docTitle = name;
  const pdfMeta: Record<string, unknown> = {};

  // --- Strategy 1: unpdf (zero-dep, preserves per-page structure) ---
  const unpdfResult = await extractViaUnpdf(filePath);
  if (unpdfResult && unpdfResult.pages.some((p) => p.trim().length > 10)) {
    extractionMode = "unpdf";
    extractionStatus = "ok";

    const info = unpdfResult.info;
    if (typeof info.Title === "string" && info.Title.trim()) docTitle = info.Title.trim();
    if (typeof info.Author === "string") pdfMeta.author = info.Author;
    if (typeof info.CreationDate === "string") pdfMeta.created = info.CreationDate;
    if (typeof info.Subject === "string") pdfMeta.subject = info.Subject;

    const cleanedPages = stripRunningHeadersFooters(unpdfResult.pages);

    for (const [pageIndex, pageText] of cleanedPages.entries()) {
      if (pageText.trim().length < 10) continue;
      const hasMarkdownHeadings = /^#{1,6}\s/m.test(pageText);
      const pageSections = (hasMarkdownHeadings ? splitIntoSections(pageText) : detectStructure(pageText)).map(
        (section) => ({
          ...section,
          provenance: {
            ...section.provenance,
            locator: {
              ...section.provenance?.locator,
              pageRange: {
                start: pageIndex + 1,
                end: pageIndex + 1,
              },
            },
          },
        }),
      );
      sections.push(...pageSections);
    }
  }

  // --- Strategy 2: pdftotext (better layout for complex PDFs) ---
  // Also try if unpdf produced very little text (< 200 chars total) — likely scanned/sparse
  const unpdfCharCount = sections.reduce((sum, s) => sum + s.content.length, 0);
  if ((sections.length === 0 || unpdfCharCount < 200) && hasPdftotext) {
    const rawText = await extractViaPdftotext(filePath);
    if (rawText && rawText.length > 10) {
      const pdftotextSections = detectStructure(rawText);
      // Use pdftotext result if it's richer than unpdf
      if (pdftotextSections.reduce((s, sec) => s + sec.content.length, 0) > unpdfCharCount) {
        extractionMode = "pdftotext";
        extractionStatus = "ok";
        sections = pdftotextSections;
      }
    } else if (sections.length === 0) {
      extractionMode = "pdftotext-empty";
    }
  }

  // --- Fallback: scanned/image PDF ---
  if (sections.length === 0) {
    const hint = hasTesseract
      ? "This PDF appears to be scanned or image-based. `tesseract` is available, so OCR may help."
      : "This PDF appears to be scanned or image-based. Install `tesseract` and run `mda doctor` to enable OCR support.";
    sections.push({
      heading: "PDF Document",
      content: `*File: ${name}*\n\nNo machine-readable text was found in this PDF.\n\n${hint}`,
    });
    extractionStatus = "weak";
  }

  return {
    title: docTitle,
    source: filePath,
    sourceType: "pdf",
    sections,
    metadata: {
      extraction: extractionMode,
      extraction_status: extractionStatus,
      file_name: name,
      file_size_bytes: fileSize,
      ...(unpdfResult ? { page_count: unpdfResult.pages.length } : {}),
      section_count: sections.length,
      pdftotext_available: hasPdftotext,
      tesseract_available: hasTesseract,
      ...pdfMeta,
    },
  };
}
