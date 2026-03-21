import { describe, expect, test } from "bun:test";
import { attachDocumentProvenance } from "../../src/core/provenance";
import type { NormalizedDocument } from "../../src/core/types";
import { splitIntoSections } from "../../src/utils/split-sections";

describe("provenance", () => {
  test("splitIntoSections preserves nested heading ancestry", () => {
    const sections = splitIntoSections(`
# Overview
This section has enough content to become a real section.

## Details
This child section also has enough content to be retained.

### Deep Dive
This grandchild section should keep the full heading ancestry.
`);

    expect(sections).toHaveLength(3);
    expect(sections[0]?.provenance?.headingPath).toEqual(["Overview"]);
    expect(sections[1]?.provenance?.headingPath).toEqual(["Overview", "Details"]);
    expect(sections[2]?.provenance?.headingPath).toEqual(["Overview", "Details", "Deep Dive"]);
  });

  test("attachDocumentProvenance adds document and fragment ids", () => {
    const doc: NormalizedDocument = {
      title: "Spec",
      source: "/tmp/spec.md",
      sourceType: "markdown",
      sections: [
        { heading: "Intro", content: "Enough content to count as a proper section." },
        { heading: "Intro", content: "A second section with the same heading should still get a unique id." },
      ],
      metadata: {
        extraction: "passthrough",
        extraction_status: "ok",
      },
    };

    const finalized = attachDocumentProvenance(doc);

    expect(finalized.provenance?.documentId).toMatch(/^markdown-/);
    expect(finalized.sections[0]?.id).toContain(finalized.provenance?.documentId ?? "");
    expect(finalized.sections[1]?.id).not.toBe(finalized.sections[0]?.id);
    expect(finalized.sections[1]?.provenance?.fragmentId).toContain("#intro-2");
    expect(finalized.metadata.document_id).toBe(finalized.provenance?.documentId);
    expect(finalized.metadata.fragment_count).toBe(2);
  });
});
