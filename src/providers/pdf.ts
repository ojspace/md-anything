import { stat } from "node:fs/promises";
import { basename } from "node:path";
import { execSync } from "node:child_process";
import type { NormalizedDocument } from "../core/types";

async function runPdftotext(filePath: string): Promise<string | null> {
  try {
    const result = execSync(`pdftotext "${filePath}" - 2>/dev/null`, {
      encoding: "utf-8",
      timeout: 30000,
    });
    return result.trim() || null;
  } catch {
    return null;
  }
}

export async function convertPdf(filePath: string, hasPdftotext = false): Promise<NormalizedDocument> {
  const name = basename(filePath);
  let fileSize = 0;

  try {
    const s = await stat(filePath);
    fileSize = s.size;
  } catch {
    // ignore
  }
  let text: string | null = null;
  let extractionMode = "unavailable";
  let extractionStatus = "weak";

  if (hasPdftotext) {
    text = await runPdftotext(filePath);
    if (text && text.length > 10) {
      extractionMode = "pdftotext";
      extractionStatus = "ok";
    } else {
      extractionMode = "pdftotext-empty";
      extractionStatus = "weak";
    }
  }

  const sections = [];

  if (text && text.length > 10) {
    sections.push({ content: text });
  } else {
    sections.push({
      heading: "PDF Document",
      content: `*File: ${name}*\n\nNo machine-readable text found.${hasPdftotext ? " The PDF may be scanned/image-based. Consider OCR." : "\n\nInstall \`pdftotext\` (poppler-utils) for text extraction."}`,
    });
  }

  return {
    title: name,
    source: filePath,
    sourceType: "pdf",
    sections,
    metadata: {
      extraction: extractionMode,
      extraction_status: extractionStatus,
      file_name: name,
      file_size_bytes: fileSize,
      pdftotext_available: hasPdftotext,
    },
  };
}
