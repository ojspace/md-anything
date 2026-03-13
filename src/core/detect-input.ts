import { existsSync } from "node:fs";
import { extname } from "node:path";
import type { InputKind } from "./types";

const YOUTUBE_PATTERNS = [
  /youtube\.com\/watch\?.*v=/,
  /youtu\.be\//,
  /youtube\.com\/shorts\//,
];

const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);
const AUDIO_EXTS = new Set([".mp3", ".wav", ".ogg", ".m4a", ".flac"]);
const VIDEO_EXTS = new Set([".mp4", ".mov", ".avi", ".mkv", ".webm"]);

export function detectInputKind(input: string): InputKind {
  if (input.startsWith("http://") || input.startsWith("https://")) {
    for (const pattern of YOUTUBE_PATTERNS) {
      if (pattern.test(input)) return "youtube";
    }
    return "url";
  }

  const ext = extname(input).toLowerCase();

  if (ext === ".txt") return "text";
  if (ext === ".md" || ext === ".markdown") return "markdown";
  if (ext === ".json") return "json";
  if (ext === ".html" || ext === ".htm") return "html";
  if (ext === ".pdf") return "pdf";
  if (ext === ".epub") return "epub";
  if (ext === ".mobi" || ext === ".azw" || ext === ".azw3") return "mobi";
  if (IMAGE_EXTS.has(ext)) return "image";
  if (AUDIO_EXTS.has(ext)) return "audio";
  if (VIDEO_EXTS.has(ext)) return "video";

  // Try to detect from content if file exists
  if (existsSync(input)) {
    return "text";
  }

  return "unknown";
}
