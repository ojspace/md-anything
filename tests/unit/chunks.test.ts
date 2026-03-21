import { describe, expect, test } from "bun:test";
import { attachDocumentChunks } from "../../src/core/chunks";
import type { NormalizedDocument } from "../../src/core/types";

describe("document chunking", () => {
  test("creates section-aware chunks with heading and page provenance", () => {
    const doc: NormalizedDocument = {
      title: "Paged PDF",
      source: "/tmp/paged.pdf",
      sourceType: "pdf",
      sections: [
        {
          id: "pdf-1#overview",
          heading: "Overview",
          content: "This page has enough content to become a chunk for the overview section.",
          provenance: {
            fragmentId: "pdf-1#overview",
            headingPath: ["Overview"],
            locator: {
              pageRange: { start: 2, end: 2 },
            },
          },
        },
      ],
      metadata: {
        document_id: "pdf-1",
        extraction: "unpdf",
        extraction_status: "ok",
      },
      provenance: {
        version: 1,
        documentId: "pdf-1",
        title: "Paged PDF",
        source: "/tmp/paged.pdf",
        sourceType: "pdf",
        sectionCount: 1,
      },
    };

    const chunked = attachDocumentChunks(doc);

    expect(chunked.chunks).toHaveLength(1);
    expect(chunked.chunks?.[0]?.id).toBe("pdf-1#overview::chunk-1");
    expect(chunked.chunks?.[0]?.content).toContain("## Overview");
    expect(chunked.chunks?.[0]?.provenance.locator?.pageRange).toEqual({ start: 2, end: 2 });
    expect(chunked.metadata.chunk_count).toBe(1);
    expect(chunked.provenance?.chunkCount).toBe(1);
  });

  test("preserves markdown tables in a single chunk with nearby caption text", () => {
    const doc: NormalizedDocument = {
      title: "Table Doc",
      source: "/tmp/table.md",
      sourceType: "markdown",
      sections: [
        {
          id: "doc#table",
          heading: "Metrics",
          content: [
            "Table 1:",
            "",
            "| Metric | Value |",
            "| --- | --- |",
            "| Revenue | 10 |",
            "| Margin | 20% |",
          ].join("\n"),
          provenance: {
            fragmentId: "doc#table",
            headingPath: ["Metrics"],
          },
        },
      ],
      metadata: {
        document_id: "doc",
        extraction: "passthrough",
        extraction_status: "ok",
      },
      provenance: {
        version: 1,
        documentId: "doc",
        title: "Table Doc",
        source: "/tmp/table.md",
        sourceType: "markdown",
        sectionCount: 1,
      },
    };

    const chunked = attachDocumentChunks(doc);

    expect(chunked.chunks).toHaveLength(1);
    expect(chunked.chunks?.[0]?.content).toContain("Table 1:");
    expect(chunked.chunks?.[0]?.content).toContain("| Metric | Value |");
    expect(chunked.chunks?.[0]?.content).toContain("| Margin | 20% |");
  });
});
