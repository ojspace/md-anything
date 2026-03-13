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
