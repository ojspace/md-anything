import { createHash } from "node:crypto";
import type { DocumentProvenance, NormalizedDocument, Section } from "./types";

const PROVENANCE_VERSION = 1 as const;

function slugifySegment(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function buildDocumentId(doc: NormalizedDocument): string {
  const digest = createHash("sha1")
    .update(`${doc.sourceType}:${doc.source}`)
    .digest("hex")
    .slice(0, 12);
  return `${doc.sourceType}-${digest}`;
}

function buildHeadingPath(section: Section): string[] {
  const path = section.provenance?.headingPath
    ?.map((segment) => segment.trim())
    .filter(Boolean);
  if (path && path.length > 0) {
    return path;
  }

  const heading = section.heading?.trim();
  return heading ? [heading] : [];
}

function buildFragmentBase(section: Section, index: number): string {
  const headingPath = buildHeadingPath(section);
  const slugPath = headingPath.map(slugifySegment).filter(Boolean);
  return slugPath.length > 0 ? slugPath.join("__") : `section-${index + 1}`;
}

function buildDocumentProvenance(doc: NormalizedDocument, documentId: string): DocumentProvenance {
  const extractionMode = typeof doc.metadata.extraction === "string" ? doc.metadata.extraction : undefined;
  const extractionStatus =
    typeof doc.metadata.extraction_status === "string" ? doc.metadata.extraction_status : undefined;

  return {
    version: PROVENANCE_VERSION,
    documentId,
    title: doc.title,
    source: doc.source,
    sourceType: doc.sourceType,
    sectionCount: doc.sections.length,
    extraction: {
      mode: extractionMode,
      status: extractionStatus,
    },
  };
}

export function attachDocumentProvenance(doc: NormalizedDocument): NormalizedDocument {
  const documentId = doc.provenance?.documentId ?? buildDocumentId(doc);
  const fragmentCounts = new Map<string, number>();

  const sections = doc.sections.map((section, index) => {
    const fragmentBase = buildFragmentBase(section, index);
    const occurrence = (fragmentCounts.get(fragmentBase) ?? 0) + 1;
    fragmentCounts.set(fragmentBase, occurrence);

    const uniqueBase = occurrence === 1 ? fragmentBase : `${fragmentBase}-${occurrence}`;
    const fragmentId = `${documentId}#${uniqueBase}`;
    const headingPath = buildHeadingPath(section);

    return {
      ...section,
      id: section.id ?? fragmentId,
      provenance: {
        ...section.provenance,
        fragmentId,
        sectionIndex: section.provenance?.sectionIndex ?? index,
        ...(headingPath.length > 0 ? { headingPath } : {}),
      },
    };
  });

  const nextDoc = { ...doc, sections };
  const provenance = {
    ...doc.provenance,
    ...buildDocumentProvenance(nextDoc, documentId),
  };

  return {
    ...nextDoc,
    provenance,
    metadata: {
      ...nextDoc.metadata,
      document_id: provenance.documentId,
      fragment_count: sections.length,
      provenance_version: PROVENANCE_VERSION,
    },
  };
}
