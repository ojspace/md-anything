import { expect, test, describe } from "bun:test";
import { evaluateDocumentUsefulness } from "../../src/core/usefulness";
import type { NormalizedDocument } from "../../src/core/types";

function makeDoc(overrides: Partial<NormalizedDocument> = {}): NormalizedDocument {
  return {
    title: "Test",
    source: "test.txt",
    sourceType: "text",
    sections: [{ content: "This is a good piece of content with plenty of text to evaluate." }],
    metadata: { extraction_status: "ok" },
    ...overrides,
  };
}

describe("evaluateDocumentUsefulness", () => {
  test("marks documents with good content as useful", () => {
    const doc = makeDoc();
    const result = evaluateDocumentUsefulness(doc);
    expect(result.useful).toBe(true);
    expect(result.score).toBeGreaterThan(0.5);
  });

  test("marks documents with very short content as not fully useful", () => {
    const doc = makeDoc({ sections: [{ content: "hi" }] });
    const result = evaluateDocumentUsefulness(doc);
    expect(result.score).toBeLessThan(0.8);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  test("marks documents with weak extraction status lower", () => {
    const doc = makeDoc({ metadata: { extraction_status: "weak" } });
    const result = evaluateDocumentUsefulness(doc);
    expect(result.score).toBeLessThan(0.9);
    expect(result.reasons.some((r) => r.includes("weak"))).toBe(true);
  });

  test("marks documents with no sections as not useful", () => {
    const doc = makeDoc({ sections: [] });
    const result = evaluateDocumentUsefulness(doc);
    expect(result.useful).toBe(false);
    expect(result.score).toBe(0);
  });

  test("marks low_confidence_output docs lower", () => {
    const doc = makeDoc({ metadata: { extraction_status: "ok", low_confidence_output: true } });
    const result = evaluateDocumentUsefulness(doc);
    expect(result.score).toBeLessThan(0.9);
  });
});
