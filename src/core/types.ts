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

export interface Section {
  heading?: string;
  content: string;
}

export interface NormalizedDocument {
  title: string;
  source: string;
  sourceType: InputKind;
  summary?: string;
  sections: Section[];
  metadata: Record<string, unknown>;
}

export interface ConvertResult {
  input: string;
  kind: InputKind;
  markdown: string;
  metadata: Record<string, unknown>;
}

export interface IngestOptions {
  graph?: boolean;
  index?: boolean;
  wikilinks?: boolean;
  recursive?: boolean;
}

export interface IngestDoc {
  fileName: string;
  title: string;
  source: string;
  sourceType: InputKind;
  summary?: string;
  sections: Section[];
  metadata: Record<string, unknown>;
  graph: {
    entities: string[];
    relations: string[];
    relatedNotes: string[];
  };
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
