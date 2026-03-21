import { expect, test, describe } from "bun:test";
import { join } from "node:path";
import { writeFile, mkdir } from "node:fs/promises";
import { convertMobi } from "../../src/providers/mobi";

const TMP = join(import.meta.dir, "../tmp-mobi-tests");

async function setup() {
  await mkdir(TMP, { recursive: true });
}

describe("mobi conversion (baseline, no ebook-convert required)", () => {
  test("detects mobi kind for .mobi and .azw files", async () => {
    const { detectInputKind } = await import("../../src/core/detect-input");
    expect(detectInputKind("test.mobi")).toBe("mobi");
    expect(detectInputKind("test.azw")).toBe("mobi");
    expect(detectInputKind("test.azw3")).toBe("mobi");
  });

  test("returns fallback when ebook-convert not available", async () => {
    await setup();
    const mobiPath = join(TMP, "test-book.mobi");
    await writeFile(mobiPath, Buffer.alloc(100));

    const doc = await convertMobi(mobiPath, false);

    expect(doc.sourceType).toBe("mobi");
    expect(doc.title).toBe("test-book.mobi");
    expect(doc.metadata.extraction).toBe("unavailable");
    expect(doc.metadata.extraction_status).toBe("weak");
    expect(doc.metadata.ebook_convert_available).toBe(false);
    expect(doc.metadata.low_confidence_output).toBe(true);
    expect(doc.sections.length).toBe(1);
    expect(doc.sections[0].content).toContain("MOBI conversion requires Calibre");
    expect(doc.sections[0].content).toContain("ebook-convert");
  });

  test("mobi metadata includes file name and size", async () => {
    await setup();
    const mobiPath = join(TMP, "test-book-2.azw");
    await writeFile(mobiPath, Buffer.alloc(2048));

    const doc = await convertMobi(mobiPath, false);

    expect(doc.metadata.file_name).toBe("test-book-2.azw");
    expect(doc.metadata.file_size_bytes).toBe(2048);
  });

  test("mobi fallback includes installation guidance", async () => {
    await setup();
    const mobiPath = join(TMP, "no-tools.mobi");
    await writeFile(mobiPath, Buffer.alloc(100));

    const doc = await convertMobi(mobiPath, false);

    expect(doc.sections[0].content).toContain("calibre-ebook.com");
    expect(doc.sections[0].content).toContain("mda doctor");
  });

  test("mobi conversion through pipeline", async () => {
    await setup();
    const mobiPath = join(TMP, "pipeline-test.mobi");
    await writeFile(mobiPath, Buffer.alloc(100));

    const { convertToMarkdown } = await import("../../src/core/convert");
    const { createRuntimeProviders } = await import("../../src/core/runtime");
    const { DEFAULT_CONFIG } = await import("../../src/config/defaults");

    const runtime = createRuntimeProviders(DEFAULT_CONFIG);
    const result = await convertToMarkdown(
      { input: mobiPath, options: DEFAULT_CONFIG.options },
      runtime,
    );

    expect(result.kind).toBe("mobi");
    expect(result.metadata.support_level).toBe("best-effort");
    expect(result.markdown).toBeDefined();
    expect(result.markdown.length).toBeGreaterThan(0);
  });

  test("mobi with ebook-convert available but file is invalid", async () => {
    await setup();
    const mobiPath = join(TMP, "invalid.mobi");
    await writeFile(mobiPath, Buffer.alloc(50));

    const doc = await convertMobi(mobiPath, true);

    expect(doc.sourceType).toBe("mobi");
    expect(doc.metadata.ebook_convert_available).toBe(true);
    // ebook-convert will fail on invalid file, should still return gracefully
    expect(doc.sections.length).toBeGreaterThan(0);
    expect(doc.metadata.extraction_status).toBe("weak");
  });
});
