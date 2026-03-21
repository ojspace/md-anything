import { expect, test, describe } from "bun:test";
import { join } from "node:path";
import { convertToMarkdown } from "../../src/core/convert";
import { createRuntimeProviders } from "../../src/core/runtime";
import { DEFAULT_CONFIG } from "../../src/config/defaults";
import { finalizeDocument } from "../../src/core/finalize-document";
import type { NormalizedDocument } from "../../src/core/types";

const runtime = createRuntimeProviders(DEFAULT_CONFIG);
const FIXTURES = join(import.meta.dir, "../fixtures");

function makeWeakDoc(): NormalizedDocument {
  return {
    title: "Weak doc",
    source: "test.txt",
    sourceType: "text",
    sections: [{ content: "hi" }],
    metadata: { extraction_status: "weak", low_confidence_output: true },
  };
}

function makeStrongDoc(): NormalizedDocument {
  return {
    title: "Strong doc",
    source: "test.txt",
    sourceType: "text",
    sections: [{ content: "This is a substantial piece of content that passes the usefulness threshold." }],
    metadata: { extraction_status: "ok" },
  };
}

describe("usefulness and finalize-document", () => {
  test("finalizeDocument adds usefulness_score to metadata", () => {
    const doc = finalizeDocument(makeStrongDoc());
    expect(doc.metadata.usefulness_score).toBeDefined();
    expect(typeof doc.metadata.usefulness_score).toBe("number");
  });

  test("finalizeDocument adds extraction note for weak docs", () => {
    const doc = finalizeDocument(makeWeakDoc());
    const hasExtractionNote = doc.sections.some((s) => s.heading === "Extraction Notes");
    expect(hasExtractionNote).toBe(true);
    expect(doc.metadata.low_confidence_output).toBe(true);
    expect(doc.sections.some((s) => s.content.includes("mda doctor"))).toBe(true);
  });

  test("finalizeDocument does NOT add extraction note for strong docs", () => {
    const doc = finalizeDocument(makeStrongDoc());
    const hasExtractionNote = doc.sections.some((s) => s.heading === "Extraction Notes");
    expect(hasExtractionNote).toBe(false);
  });

  test("convertToMarkdown includes support_level in result metadata", async () => {
    const result = await convertToMarkdown(
      { input: join(FIXTURES, "sample.txt"), options: DEFAULT_CONFIG.options },
      runtime,
    );
    expect(result.metadata.support_level).toBe("strong");
  });

  test("convertToMarkdown includes usefulness_score in result metadata", async () => {
    const result = await convertToMarkdown(
      { input: join(FIXTURES, "sample.txt"), options: DEFAULT_CONFIG.options },
      runtime,
    );
    expect(result.metadata.usefulness_score).toBeDefined();
    expect(typeof result.metadata.usefulness_score).toBe("number");
    expect(result.metadata.document_id).toBe(result.document.provenance?.documentId);
  });

  test("usefulness_score appears in markdown frontmatter", async () => {
    const result = await convertToMarkdown(
      { input: join(FIXTURES, "sample.txt"), options: { ...DEFAULT_CONFIG.options, frontmatter: true } },
      runtime,
    );
    expect(result.markdown).toContain("usefulness_score:");
    expect(result.markdown).toContain("provenance_version:");
    expect(result.markdown).toContain("chunking_strategy:");
  });
});
