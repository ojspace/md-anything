import type { DocumentChunk, NormalizedDocument, Section, SourceLocator } from "./types";

const TARGET_CHUNK_CHARS = 1200;
const MAX_TEXT_BLOCK_CHARS = 1400;
const TABLE_CAPTION_MAX_CHARS = 220;

interface ContentBlock {
  text: string;
  isTable: boolean;
}

function countWords(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function isMarkdownTableBlock(block: string): boolean {
  const lines = block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return false;
  }

  const hasPipeRow = lines.some((line) => line.includes("|"));
  const hasDividerRow = lines.some((line) => /^\|?[\s:-]+(\|[\s:-]+)+\|?$/.test(line));
  return hasPipeRow && hasDividerRow;
}

function looksLikeTableCaption(block: string): boolean {
  const trimmed = block.trim();
  return trimmed.length > 0
    && trimmed.length <= TABLE_CAPTION_MAX_CHARS
    && (/^(table|figure|columns?)\b/i.test(trimmed) || /:\s*$/.test(trimmed));
}

function splitIntoBlocks(content: string): ContentBlock[] {
  const rawBlocks = content
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  const blocks: ContentBlock[] = [];

  for (const rawBlock of rawBlocks) {
    const nextBlock: ContentBlock = {
      text: rawBlock,
      isTable: isMarkdownTableBlock(rawBlock),
    };

    const previousBlock = blocks[blocks.length - 1];
    if (nextBlock.isTable && previousBlock && !previousBlock.isTable && looksLikeTableCaption(previousBlock.text)) {
      previousBlock.text = `${previousBlock.text}\n\n${nextBlock.text}`;
      previousBlock.isTable = true;
      continue;
    }

    blocks.push(nextBlock);
  }

  if (blocks.length === 0) {
    return [{ text: content.trim(), isTable: false }];
  }

  return blocks;
}

function splitOversizedText(text: string, maxChars: number): string[] {
  const normalized = text.trim();
  if (normalized.length <= maxChars) {
    return [normalized];
  }

  const sentenceParts = normalized
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'])/)
    .map((part) => part.trim())
    .filter(Boolean);

  const parts = sentenceParts.length > 1 ? sentenceParts : normalized.split(/\n+/).map((part) => part.trim()).filter(Boolean);
  if (parts.length <= 1) {
    const slices: string[] = [];
    let remaining = normalized;
    while (remaining.length > maxChars) {
      const splitAt = remaining.lastIndexOf(" ", maxChars);
      const boundary = splitAt > Math.floor(maxChars * 0.6) ? splitAt : maxChars;
      slices.push(remaining.slice(0, boundary).trim());
      remaining = remaining.slice(boundary).trim();
    }
    if (remaining.length > 0) {
      slices.push(remaining);
    }
    return slices;
  }

  const slices: string[] = [];
  let current = "";
  for (const part of parts) {
    const candidate = current ? `${current} ${part}` : part;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    if (current) {
      slices.push(current);
      current = part;
      continue;
    }

    slices.push(...splitOversizedText(part, maxChars));
  }

  if (current) {
    slices.push(current);
  }

  return slices;
}

function buildHeadingPrefix(section: Section): string {
  const headingPath = section.provenance?.headingPath ?? (section.heading ? [section.heading] : []);
  if (headingPath.length === 0) {
    return "";
  }

  return headingPath
    .map((heading, index) => `${"#".repeat(Math.min(index + 2, 6))} ${heading}`)
    .join("\n");
}

function chunkSectionBodies(section: Section): string[] {
  const blocks = splitIntoBlocks(section.content);
  const bodies: string[] = [];
  let currentParts: string[] = [];
  let currentLength = 0;

  function flush(): void {
    const body = currentParts.join("\n\n").trim();
    if (body.length > 0) {
      bodies.push(body);
    }
    currentParts = [];
    currentLength = 0;
  }

  for (const block of blocks) {
    const pieces = block.isTable ? [block.text.trim()] : splitOversizedText(block.text, MAX_TEXT_BLOCK_CHARS);

    for (const piece of pieces) {
      const pieceLength = piece.length;
      const candidateLength = currentLength === 0 ? pieceLength : currentLength + 2 + pieceLength;

      if (currentLength > 0 && candidateLength > TARGET_CHUNK_CHARS) {
        flush();
      }

      currentParts.push(piece);
      currentLength = currentLength === 0 ? pieceLength : currentLength + 2 + pieceLength;
    }
  }

  flush();
  return bodies.length > 0 ? bodies : [section.content.trim()];
}

function buildChunkContent(section: Section, body: string): string {
  const headingPrefix = buildHeadingPrefix(section);
  return headingPrefix ? `${headingPrefix}\n\n${body}` : body;
}

function buildChunkLocator(section: Section): SourceLocator | undefined {
  return section.provenance?.locator ? { ...section.provenance.locator } : undefined;
}

export function attachDocumentChunks(doc: NormalizedDocument): NormalizedDocument {
  const documentId = doc.provenance?.documentId ?? String(doc.metadata.document_id ?? doc.source);
  const chunks: DocumentChunk[] = [];
  let chunkIndex = 0;

  for (const section of doc.sections) {
    const sectionId = section.id ?? `${documentId}#section-${chunkIndex + 1}`;
    const bodies = chunkSectionBodies(section);

    bodies.forEach((body, sectionChunkIndex) => {
      const content = buildChunkContent(section, body);
      const locator = buildChunkLocator(section);
      const headingPath = section.provenance?.headingPath ? [...section.provenance.headingPath] : undefined;
      const id = `${sectionId}::chunk-${sectionChunkIndex + 1}`;

      chunks.push({
        id,
        sectionId,
        heading: section.heading,
        content,
        charCount: content.length,
        wordCount: countWords(content),
        provenance: {
          chunkIndex,
          sectionId,
          sectionChunkIndex,
          ...(headingPath ? { headingPath } : {}),
          ...(locator ? { locator } : {}),
        },
      });
      chunkIndex += 1;
    });
  }

  return {
    ...doc,
    chunks,
    provenance: doc.provenance
      ? {
          ...doc.provenance,
          chunkCount: chunks.length,
        }
      : doc.provenance,
    metadata: {
      ...doc.metadata,
      chunk_count: chunks.length,
      chunking_strategy: "section-aware-balanced",
    },
  };
}
