import { stat } from "node:fs/promises";
import { basename } from "node:path";
import { spawnSync } from "node:child_process";
import { unlink, mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { NormalizedDocument } from "../core/types";

export async function convertMobi(filePath: string, hasEbookConvert = false): Promise<NormalizedDocument> {
  const name = basename(filePath);
  let fileSize = 0;

  try {
    const s = await stat(filePath);
    fileSize = s.size;
  } catch {
    // ignore
  }

  if (!hasEbookConvert) {
    return {
      title: name,
      source: filePath,
      sourceType: "mobi",
      sections: [
        {
          heading: "MOBI Document",
          content:
            `*File: ${name}*\n\nMOBI conversion requires Calibre's ebook-convert tool.\n\n` +
            "Install Calibre to enable MOBI support: https://calibre-ebook.com/\n\n" +
            "After installing it, run `mda doctor` to verify that `ebook-convert` is available.",
        },
      ],
      metadata: {
        extraction: "unavailable",
        extraction_status: "weak",
        file_name: name,
        file_size_bytes: fileSize,
        ebook_convert_available: false,
        low_confidence_output: true,
      },
    };
  }

  let text: string | null = null;
  let extractionMode = "ebook-convert";
  let extractionStatus = "weak";

  try {
    const tmpDir = await mkdtemp(join(tmpdir(), "md-anything-mobi-"));
    const outPath = join(tmpDir, "output.txt");

    try {
      const result = spawnSync("ebook-convert", [filePath, outPath], {
        timeout: 60000,
        stdio: ["ignore", "ignore", "ignore"],
      });
      if (result.error || result.status !== 0) {
        extractionMode = "ebook-convert-failed";
      } else {
        text = await readFile(outPath, "utf-8");
        text = text.trim();
        if (text.length > 10) {
          extractionStatus = "ok";
        }
      }
    } finally {
      try { await unlink(outPath); } catch {}
      try { await rm(tmpDir, { recursive: true, force: true }); } catch {}
    }
  } catch {
    extractionMode = "ebook-convert-failed";
  }

  const sections = [];
  if (text && text.length > 10) {
    sections.push({ content: text });
  } else {
    sections.push({
      heading: "MOBI Document",
      content:
        `*File: ${name}*\n\nebook-convert ran but produced no readable text. ` +
        "The file may be DRM-protected, malformed, or image-based.",
    });
  }

  return {
    title: name,
    source: filePath,
    sourceType: "mobi",
    sections,
    metadata: {
      extraction: extractionMode,
      extraction_status: extractionStatus,
      file_name: name,
      file_size_bytes: fileSize,
      ebook_convert_available: true,
    },
  };
}
