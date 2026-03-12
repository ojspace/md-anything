import { expect, test, describe, beforeAll } from "bun:test";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { convertPdf } from "../../src/providers/pdf";
import { convertToMarkdown } from "../../src/core/convert";
import { createRuntimeProviders } from "../../src/core/runtime";
import { DEFAULT_CONFIG } from "../../src/config/defaults";

const runtime = createRuntimeProviders(DEFAULT_CONFIG);
const GENERATED = join(import.meta.dir, "../generated-fixtures");
const PDF_PATH = join(GENERATED, "sample.pdf");

describe("PDF conversion (using generated fixture)", () => {
  beforeAll(async () => {
    if (!existsSync(PDF_PATH)) {
      const { spawnSync } = await import("node:child_process");
      spawnSync("bun", ["run", "scripts/bootstrap-fixtures.ts"], {
        cwd: join(import.meta.dir, "../.."),
        stdio: "inherit",
      });
    }
  });

  test("PDF fixture exists or was generated", () => {
    if (!existsSync(PDF_PATH)) {
      console.log("⏭️  PDF fixture not available - skipping");
      return;
    }
    expect(existsSync(PDF_PATH)).toBe(true);
  });

  test("convertPdf returns NormalizedDocument with correct shape", async () => {
    if (!existsSync(PDF_PATH)) {
      console.log("⏭️  PDF fixture not available - skipping");
      return;
    }

    const doc = await convertPdf(PDF_PATH);
    
    expect(doc.sourceType).toBe("pdf");
    expect(doc.source).toBe(PDF_PATH);
    expect(doc.title).toBeDefined();
    expect(doc.sections).toBeInstanceOf(Array);
    expect(doc.sections.length).toBeGreaterThan(0);
    expect(doc.metadata.extraction).toBeDefined();
    expect(doc.metadata.pdftotext_available).toBeDefined();
  });

  test("PDF conversion result has support_level best-effort", async () => {
    if (!existsSync(PDF_PATH)) {
      console.log("⏭️  PDF fixture not available - skipping");
      return;
    }

    const result = await convertToMarkdown(
      { input: PDF_PATH, options: DEFAULT_CONFIG.options },
      runtime,
    );

    expect(result.kind).toBe("pdf");
    expect(result.metadata.support_level).toBe("best-effort");
    expect(result.markdown).toBeDefined();
  });
});
