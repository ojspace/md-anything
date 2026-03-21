export type InputKind =
  | "text"
  | "markdown"
  | "json"
  | "html"
  | "url"
  | "youtube"
  | "image"
  | "pdf"
  | "epub"
  | "mobi"
  | "audio"
  | "video"
  | "unknown";

export interface PageRange {
  start: number;
  end: number;
}

export interface SourceLocator {
  pageRange?: PageRange;
}

export interface SectionProvenance {
  fragmentId?: string;
  sectionIndex?: number;
  headingPath?: string[];
  locator?: SourceLocator;
}

export interface DocumentProvenance {
  version: 1;
  documentId: string;
  title: string;
  source: string;
  sourceType: InputKind;
  sectionCount: number;
  chunkCount?: number;
  extraction?: {
    mode?: string;
    status?: string;
  };
}

export interface Section {
  id?: string;
  heading?: string;
  kind?: string;
  content: string;
  provenance?: SectionProvenance;
}

export interface ChunkProvenance {
  chunkIndex: number;
  sectionId: string;
  sectionChunkIndex: number;
  headingPath?: string[];
  locator?: SourceLocator;
}

export interface DocumentChunk {
  id: string;
  sectionId: string;
  heading?: string;
  content: string;
  charCount: number;
  wordCount: number;
  provenance: ChunkProvenance;
}

export interface NormalizedDocument {
  title: string;
  source: string;
  sourceType: InputKind;
  summary?: string;
  sections: Section[];
  chunks?: DocumentChunk[];
  metadata: Record<string, unknown>;
  provenance?: DocumentProvenance;
}

export interface ConvertResult {
  input: string;
  kind: InputKind;
  markdown: string;
  chunks: DocumentChunk[];
  metadata: Record<string, unknown>;
  document: NormalizedDocument;
}

export interface IngestOptions {
  recursive?: boolean;
}

export interface IngestDoc {
  fileName: string;
  title: string;
  source: string;
  sourceType: InputKind;
  summary?: string;
  sections: Section[];
  chunks?: DocumentChunk[];
  metadata: Record<string, unknown>;
  provenance?: DocumentProvenance;
}

export interface IngestResult {
  converted: number;
  skipped: number;
  failed: number;
  outputFiles: string[];
  docs: IngestDoc[];
}

export interface ConvertOptions {
  mode?: "fast" | "balanced" | "thorough";
  summary?: boolean;
  frontmatter?: boolean;
  timestamps?: boolean;
  speakers?: boolean;
  tables?: boolean;
}

export interface ConvertRequest {
  input: string;
  options: ConvertOptions;
}
