import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, readdirSync, readFileSync } from "node:fs";
import { stat } from "node:fs/promises";
import { basename, join } from "node:path";
import { tmpdir } from "node:os";
import type { NormalizedDocument } from "../core/types";
import { htmlToMarkdown } from "../utils/html-to-markdown";
import { splitIntoSections } from "../utils/split-sections";

function extractViaPandoc(filePath: string): string | null {
  try {
    const result = spawnSync("pandoc", ["-f", "pptx", "-t", "markdown", "--wrap=none", filePath], {
      encoding: "utf-8",
      timeout: 60000,
      stdio: ["ignore", "pipe", "ignore"],
    });
    if (result.error || result.status !== 0) return null;
    return result.stdout.trim() || null;
  } catch {
    return null;
  }
}

function extractViaLibreOffice(filePath: string): string | null {
  const tmpDir = join(tmpdir(), `mda-pptx-${Date.now()}`);
  try {
    mkdirSync(tmpDir, { recursive: true });
    const result = spawnSync("soffice", ["--headless", "--convert-to", "html", "--outdir", tmpDir, filePath], {
      encoding: "utf-8",
      timeout: 120000,
      stdio: ["ignore", "pipe", "ignore"],
    });

    if (result.error || result.status !== 0) return null;

    const htmlFiles = readdirSync(tmpDir).filter((f) => f.endsWith(".html") || f.endsWith(".htm"));
    if (htmlFiles.length === 0) return null;

    const html = readFileSync(join(tmpDir, htmlFiles[0]), "utf-8");
    return htmlToMarkdown(html) || null;
  } catch {
    return null;
  } finally {
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }
}

function buildResult(
  markdown: string,
  filePath: string,
  name: string,
  fileSize: number,
  extractionMode: string,
): NormalizedDocument {
  const sections = splitIntoSections(markdown);

  let title = name;
  for (const s of sections) {
    if (s.heading) {
      title = s.heading;
      break;
    }
  }

  return {
    title,
    source: filePath,
    sourceType: "pptx",
    sections,
    metadata: {
      extraction: extractionMode,
      extraction_status: sections.length > 0 ? "ok" : "weak",
      file_name: name,
      file_size_bytes: fileSize,
      section_count: sections.length,
    },
  };
}

export async function convertPptx(
  filePath: string,
  hasPandoc = false,
  hasLibreOffice = false,
): Promise<NormalizedDocument> {
  const name = basename(filePath);
  let fileSize = 0;

  try {
    const s = await stat(filePath);
    fileSize = s.size;
  } catch {
    // ignore
  }

  if (hasPandoc) {
    const markdown = extractViaPandoc(filePath);
    if (markdown && markdown.length > 20) {
      return buildResult(markdown, filePath, name, fileSize, "pandoc");
    }
  }

  if (hasLibreOffice) {
    const markdown = extractViaLibreOffice(filePath);
    if (markdown && markdown.length > 20) {
      return buildResult(markdown, filePath, name, fileSize, "libreoffice");
    }
  }

  const hint =
    !hasPandoc && !hasLibreOffice
      ? "Install `pandoc` or LibreOffice to enable PPTX conversion.\n\n  brew install pandoc\n  brew install --cask libreoffice"
      : "Conversion tools were detected but failed to extract content from this file.";

  return {
    title: name,
    source: filePath,
    sourceType: "pptx",
    sections: [
      {
        heading: "Presentation",
        content: `*File: ${name}*\n\nCould not extract text from this presentation.\n\n${hint}`,
      },
    ],
    metadata: {
      extraction: "unavailable",
      extraction_status: "weak",
      file_name: name,
      file_size_bytes: fileSize,
      pandoc_available: hasPandoc,
      libreoffice_available: hasLibreOffice,
    },
  };
}
