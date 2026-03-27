import { expect, test, describe, beforeAll } from "bun:test";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { convertEpub } from "../../src/providers/epub";
import { convertToMarkdown } from "../../src/core/convert";
import { createRuntimeProviders } from "../../src/core/runtime";
import { DEFAULT_CONFIG } from "../../src/config/defaults";
import type { RuntimeProviders } from "../../src/core/runtime";

const runtime = createRuntimeProviders(DEFAULT_CONFIG);
const GENERATED = join(import.meta.dir, "../generated-fixtures");
const EPUB_PATH = join(GENERATED, "sample.epub");
const TMP = join(import.meta.dir, "../tmp-epub-tests");

describe("EPUB conversion (using generated fixture)", () => {
  beforeAll(async () => {
    if (!existsSync(EPUB_PATH)) {
      const { spawnSync } = await import("node:child_process");
      spawnSync("bun", ["run", "scripts/bootstrap-fixtures.ts"], {
        cwd: join(import.meta.dir, "../.."),
        stdio: "inherit",
      });
    }
  });

  test("EPUB fixture exists or was generated", () => {
    if (!existsSync(EPUB_PATH)) {
      console.log("⏭️  EPUB fixture not available - skipping");
      return;
    }
    expect(existsSync(EPUB_PATH)).toBe(true);
  });

  test("convertEpub returns NormalizedDocument with correct shape", async () => {
    if (!existsSync(EPUB_PATH)) {
      console.log("⏭️  EPUB fixture not available - skipping");
      return;
    }

    const doc = await convertEpub(EPUB_PATH);
    
    expect(doc.sourceType).toBe("epub");
    expect(doc.source).toBe(EPUB_PATH);
    expect(doc.title).toBeDefined();
    expect(doc.sections).toBeInstanceOf(Array);
    expect(doc.sections.length).toBeGreaterThan(0);
    expect(doc.metadata.extraction).toBeDefined();
    expect(doc.metadata.extraction_status).toBeDefined();
  });

  test("convertEpub extracts text content from valid EPUB", async () => {
    if (!existsSync(EPUB_PATH)) {
      console.log("⏭️  EPUB fixture not available - skipping");
      return;
    }

    const doc = await convertEpub(EPUB_PATH);
    
    const allContent = doc.sections.map((s) => s.content).join(" ");
    
    if (doc.metadata.extraction_status === "ok") {
      expect(allContent).toContain("md-anything");
    } else {
      expect(doc.metadata.extraction_status).toBe("weak");
      expect(doc.sections.some((s) => s.content.length > 0)).toBe(true);
    }
  });

  test("EPUB conversion result has support_level best-effort", async () => {
    if (!existsSync(EPUB_PATH)) {
      console.log("⏭️  EPUB fixture not available - skipping");
      return;
    }

    const result = await convertToMarkdown(
      { input: EPUB_PATH, options: DEFAULT_CONFIG.options },
      runtime,
    );

    expect(result.kind).toBe("epub");
    expect(result.metadata.support_level).toBe("best-effort");
    expect(result.markdown).toBeDefined();
    expect(result.markdown.length).toBeGreaterThan(0);
  });

  test("EPUB doctor warnings point to unzip when EPUB support is unavailable", async () => {
    await mkdir(TMP, { recursive: true });
    const epubPath = join(TMP, "missing-unzip.epub");
    await writeFile(epubPath, "not a real epub");

    const runtimeWithoutUnzip = {
      capabilities: {
        hasTesseract: false,
        hasPdftotext: false,
        hasEbookConvert: false,
        hasUnzip: false,
        hasFfmpeg: false,
        hasWhisper: false,
        whisperBackend: null,
        whisperCppModelPath: null,
        hasPlaywright: false,
        hasPandoc: false,
        hasLibreOffice: false,
        openRouterApiKey: null,
      },
      config: DEFAULT_CONFIG,
    } satisfies RuntimeProviders;

    const result = await convertToMarkdown(
      { input: epubPath, options: DEFAULT_CONFIG.options },
      runtimeWithoutUnzip,
    );

    expect(Array.isArray(result.metadata.doctor_warnings)).toBe(true);
    expect((result.metadata.doctor_warnings as string[])[0]).toContain("unzip not found");
    expect((result.metadata.doctor_warnings as string[])[0]).not.toContain("ebook-convert");
  });
});
