import { stat } from "node:fs/promises";
import { basename } from "node:path";
import { execSync } from "node:child_process";
import type { NormalizedDocument } from "../core/types";

async function runTesseract(filePath: string): Promise<string | null> {
  try {
    const result = execSync(`tesseract "${filePath}" stdout 2>/dev/null`, {
      encoding: "utf-8",
      timeout: 30000,
    });
    return result.trim() || null;
  } catch {
    return null;
  }
}

export async function convertImage(filePath: string, hasTesseract = false): Promise<NormalizedDocument> {
  const name = basename(filePath);
  let fileSize = 0;

  try {
    const s = await stat(filePath);
    fileSize = s.size;
  } catch {
    // ignore
  }
  let ocrText: string | null = null;
  let extractionMode = "metadata-only";
  let extractionStatus = "weak";

  if (hasTesseract) {
    ocrText = await runTesseract(filePath);
    if (ocrText && ocrText.length > 10) {
      extractionMode = "ocr";
      extractionStatus = "ok";
    } else {
      extractionMode = "ocr-empty";
      extractionStatus = "weak";
    }
  }

  const sections = [];

  if (ocrText && ocrText.length > 10) {
    sections.push({
      heading: "Extracted Text (OCR)",
      content: ocrText,
    });
  } else {
    const guidance = hasTesseract
      ? "OCR ran but did not find readable text. The image may be decorative, low contrast, or mostly non-text."
      : "OCR is not available in this environment. Install `tesseract` and run `mda doctor` to verify OCR support.";
    sections.push({
      heading: "Image",
      content: `![${name}](${filePath})\n\n*No extractable text was found in this image.*\n\n${guidance}`,
    });
  }

  return {
    title: name,
    source: filePath,
    sourceType: "image",
    sections,
    metadata: {
      extraction: extractionMode,
      extraction_status: extractionStatus,
      file_name: name,
      file_size_bytes: fileSize,
      ocr_available: hasTesseract,
      ocr_text_length: ocrText?.length ?? 0,
    },
  };
}
