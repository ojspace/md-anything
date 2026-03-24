import { ConvertRequestSchema } from "../schemas/convert";
import type { ConvertRequest, InputKind } from "./types";
import { detectInputKind } from "./detect-input";
import { routeInput } from "./route-input";
import { finalizeDocument } from "./finalize-document";
import { attachDocumentChunks } from "./chunks";
import { formatMarkdown } from "../formatters/markdown";
import type { ConvertResult } from "./types";
import type { RuntimeCapabilities, RuntimeProviders } from "./runtime";
import { INPUT_SUPPORT_LEVELS } from "./support-levels";

const MIME_TYPES: Record<InputKind, string> = {
  text: "text/plain",
  markdown: "text/markdown",
  json: "application/json",
  html: "text/html",
  url: "text/html",
  youtube: "video/x-youtube",
  image: "image/*",
  pdf: "application/pdf",
  epub: "application/epub+zip",
  mobi: "application/x-mobipocket-ebook",
  audio: "audio/*",
  video: "video/*",
  unknown: "application/octet-stream",
};

function buildDoctorWarnings(kind: InputKind, caps: RuntimeCapabilities): string[] {
  const warnings: string[] = [];
  if (kind === "image" && !caps.hasTesseract && !caps.openRouterApiKey) {
    warnings.push("tesseract not found — image OCR unavailable. Run `mda doctor`.");
  }
  if (kind === "pdf" && !caps.hasPdftotext) {
    warnings.push("pdftotext not found — PDF text extraction may be weaker. Run `mda doctor`.");
  }
  if (kind === "epub" && !caps.hasUnzip) {
    warnings.push("unzip not found — EPUB extraction unavailable. Run `mda doctor`.");
  }
  if (kind === "mobi" && !caps.hasEbookConvert) {
    warnings.push("ebook-convert not found — ebook extraction unavailable. Run `mda doctor`.");
  }
  if ((kind === "audio" || kind === "video") && !caps.hasWhisper && !caps.openRouterApiKey) {
    warnings.push("whisper-cpp not found — audio transcription unavailable. Run `mda doctor`.");
  }
  if (kind === "video" && !caps.hasFfmpeg) {
    warnings.push("ffmpeg not found — video transcription unavailable. Run `mda doctor`.");
  }
  if (kind === "audio" && caps.whisperBackend === "whisper" && !caps.hasFfmpeg) {
    warnings.push("ffmpeg not found — python whisper audio transcription is unavailable. Run `mda doctor`.");
  }
  return warnings;
}

export async function convertToMarkdown(
  rawRequest: ConvertRequest,
  runtime: RuntimeProviders,
): Promise<ConvertResult> {
  const request = ConvertRequestSchema.parse(rawRequest);
  const kind = detectInputKind(request.input);
  const supportLevel = INPUT_SUPPORT_LEVELS[kind];

  const normalized = finalizeDocument(
    await routeInput(kind, request.input, request.options, runtime),
  );

  const document = attachDocumentChunks({
    ...normalized,
    metadata: {
      ...normalized.metadata,
      support_level: supportLevel,
      conversion_date: new Date().toISOString(),
      original_mime_type: MIME_TYPES[kind],
      doctor_warnings: buildDoctorWarnings(kind, runtime.capabilities),
    },
  });

  const markdown = formatMarkdown(document, {
    frontmatter: request.options.frontmatter,
  });

  return {
    input: request.input,
    kind,
    markdown,
    chunks: document.chunks ?? [],
    metadata: document.metadata,
    document,
  };
}
