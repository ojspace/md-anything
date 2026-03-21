import { expect, test, describe } from "bun:test";
import { join } from "node:path";
import { convertToMarkdown } from "../../src/core/convert";
import { createRuntimeProviders } from "../../src/core/runtime";
import { DEFAULT_CONFIG } from "../../src/config/defaults";

const runtime = createRuntimeProviders(DEFAULT_CONFIG);
const FIXTURES = join(import.meta.dir, "../fixtures");

describe("text conversion", () => {
  test("converts .txt file to markdown", async () => {
    const result = await convertToMarkdown(
      { input: join(FIXTURES, "sample.txt"), options: DEFAULT_CONFIG.options },
      runtime,
    );

    expect(result.kind).toBe("text");
    expect(result.markdown).toContain("Hello from md-anything");
    expect(result.metadata.support_level).toBe("strong");
    expect(result.metadata.extraction_status).toBe("ok");
    expect(result.document.provenance?.documentId).toBeDefined();
    expect(result.document.sections[0]?.id).toBeDefined();
    expect(result.document.sections[0]?.provenance?.fragmentId).toBeDefined();
    expect(Array.isArray(result.chunks)).toBe(true);
    expect(result.chunks.length).toBeGreaterThan(0);
    expect(result.metadata.chunk_count).toBe(result.chunks.length);
  });

  test("converts .md file to markdown (passthrough)", async () => {
    const result = await convertToMarkdown(
      { input: join(FIXTURES, "sample.md"), options: DEFAULT_CONFIG.options },
      runtime,
    );

    expect(result.kind).toBe("markdown");
    expect(result.markdown).toContain("Sample Markdown Document");
    expect(result.metadata.support_level).toBe("strong");
  });

  test("output includes YAML frontmatter", async () => {
    const result = await convertToMarkdown(
      { input: join(FIXTURES, "sample.txt"), options: { ...DEFAULT_CONFIG.options, frontmatter: true } },
      runtime,
    );

    expect(result.markdown).toContain("---");
    expect(result.markdown).toContain("source_type: text");
    expect(result.markdown).toContain("extraction_status:");
    expect(result.markdown).toContain("support_level: strong");
    expect(result.markdown).toContain("document_id:");
    expect(result.markdown).toContain("fragment_count:");
    expect(result.markdown).toContain("chunk_count:");
  });

  test("output includes support_level in metadata", async () => {
    const result = await convertToMarkdown(
      { input: join(FIXTURES, "sample.txt"), options: DEFAULT_CONFIG.options },
      runtime,
    );

    expect(result.metadata.support_level).toBe("strong");
    expect(result.metadata.usefulness_score).toBeDefined();
  });
});
