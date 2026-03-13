import { expect, test, describe } from "bun:test";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { convertToMarkdown } from "../../src/core/convert";
import { createRuntimeProviders } from "../../src/core/runtime";
import { DEFAULT_CONFIG } from "../../src/config/defaults";
import { convertImage } from "../../src/providers/image";

const runtime = createRuntimeProviders(DEFAULT_CONFIG);
const FIXTURES = join(import.meta.dir, "../fixtures");

describe("image conversion (baseline, no OCR required)", () => {
  test("detects image kind for .png files", async () => {
    const { detectInputKind } = await import("../../src/core/detect-input");
    expect(detectInputKind("test.png")).toBe("image");
    expect(detectInputKind("test.jpg")).toBe("image");
    expect(detectInputKind("test.jpeg")).toBe("image");
    expect(detectInputKind("test.webp")).toBe("image");
    expect(detectInputKind("test.gif")).toBe("image");
  });

  test("converts image file to markdown with metadata", async () => {
    const pngPath = join(FIXTURES, "sample.png");
    
    if (!existsSync(pngPath)) {
      const { writeFile } = await import("node:fs/promises");
      const minimalPng = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
        0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
        0x00, 0x00, 0x02, 0x00, 0x01, 0xe2, 0x21, 0xbc, 0x33, 0x00, 0x00, 0x00,
        0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
      ]);
      await writeFile(pngPath, minimalPng);
    }

    const doc = await convertImage(pngPath);
    
    expect(doc.sourceType).toBe("image");
    expect(doc.metadata.file_name).toBe("sample.png");
    expect(doc.metadata.extraction).toBeDefined();
    expect(doc.metadata.extraction_status).toBeDefined();
    expect(doc.metadata.ocr_available).toBeDefined();
    expect(doc.sections.length).toBeGreaterThan(0);
  });

  test("image conversion result has required metadata fields", async () => {
    const pngPath = join(FIXTURES, "sample.png");
    
    if (!existsSync(pngPath)) {
      const { writeFile } = await import("node:fs/promises");
      const minimalPng = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
        0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
        0x00, 0x00, 0x02, 0x00, 0x01, 0xe2, 0x21, 0xbc, 0x33, 0x00, 0x00, 0x00,
        0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
      ]);
      await writeFile(pngPath, minimalPng);
    }

    const result = await convertToMarkdown(
      { input: pngPath, options: DEFAULT_CONFIG.options },
      runtime,
    );

    expect(result.kind).toBe("image");
    expect(result.metadata.support_level).toBe("best-effort");
    expect(result.metadata.ocr_available).toBeDefined();
    expect(result.markdown).toBeDefined();
    expect(result.markdown.length).toBeGreaterThan(0);
  });
});
