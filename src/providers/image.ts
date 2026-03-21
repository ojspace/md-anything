import { stat } from "node:fs/promises";
import { basename } from "node:path";
import { spawnSync } from "node:child_process";
import type { NormalizedDocument } from "../core/types";
import { describeImageWithVL } from "./openrouter-client";

async function runTesseract(filePath: string): Promise<string | null> {
  try {
    const result = spawnSync("tesseract", [filePath, "stdout"], {
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

export async function convertImage(
  filePath: string,
  hasTesseract = false,
  openRouterApiKey: string | null = null,
): Promise<NormalizedDocument> {
  const name = basename(filePath);
  let fileSize = 0;

  try {
    const s = await stat(filePath);
    fileSize = s.size;
  } catch {
    // ignore
  }

  // Prefer local OCR first to keep the default behavior private and lightweight.
  let ocrText: string | null = null;
  let extractionMode = "metadata-only";
  let extractionStatus = "weak";

  if (hasTesseract) {
    ocrText = await runTesseract(filePath);
    if (ocrText && ocrText.length > 10) {
      return {
        title: name,
        source: filePath,
        sourceType: "image",
        sections: [{ heading: "Extracted Text (OCR)", kind: "ocr", content: ocrText }],
        metadata: {
          extraction: "ocr",
          extraction_status: "ok",
          file_name: name,
          file_size_bytes: fileSize,
          ocr_available: true,
          ocr_backend: "tesseract",
          ocr_text_length: ocrText.length,
        },
      };
    }

    extractionMode = "ocr-empty";
    extractionStatus = "weak";
  }

  // Optional remote fallback for richer image understanding when explicitly enabled.
  if (openRouterApiKey) {
    const description = await describeImageWithVL(openRouterApiKey, filePath);
    if (description && description.length > 10) {
      return {
        title: name,
        source: filePath,
        sourceType: "image",
        sections: [{ heading: "Image Content", kind: "content", content: description }],
        metadata: {
          extraction: "openrouter-vl",
          extraction_status: "ok",
          file_name: name,
          file_size_bytes: fileSize,
          model: "nvidia/nemotron-nano-12b-v2-vl:free",
          description_length: description.length,
          ocr_available: hasTesseract,
          remote_fallback_used: true,
        },
      };
    }
  }

  if (!hasTesseract) {
    extractionMode = "metadata-only";
    extractionStatus = "weak";
  }

  const sections = [];

  if (ocrText && ocrText.length > 10) {
    sections.push({ heading: "Extracted Text (OCR)", kind: "ocr", content: ocrText });
  } else {
    const guidance = hasTesseract
      ? "Local OCR ran but did not find readable text. The image may be decorative, low contrast, or mostly non-text. For a richer opt-in fallback, set `OPENROUTER_API_KEY`."
      : "Install `tesseract` for local OCR, or set `OPENROUTER_API_KEY` for optional remote image understanding.";
    sections.push({
      heading: "Image",
      kind: "fallback",
      content: `![${name}](${filePath})\n\n*No extractable text was found in this image.*\n\n${guidance}\n\nThen run \`mda doctor\` to see which optional upgrades are available.`,
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
      remote_fallback_available: openRouterApiKey !== null,
    },
  };
}
