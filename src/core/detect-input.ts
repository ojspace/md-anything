import { existsSync } from "node:fs";
import { extname, basename } from "node:path";
import type { InputKind } from "./types";

const YOUTUBE_PATTERNS = [
  /youtube\.com\/watch\?.*v=/,
  /youtu\.be\//,
  /youtube\.com\/shorts\//,
];

const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);
const AUDIO_EXTS = new Set([".mp3", ".wav", ".ogg", ".m4a", ".flac"]);
const VIDEO_EXTS = new Set([".mp4", ".mov", ".avi", ".mkv", ".webm"]);
const CODE_EXTS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".py", ".rb", ".go", ".rs", ".java", ".kt", ".kts",
  ".cs", ".cpp", ".cc", ".cxx", ".c", ".h", ".hpp",
  ".swift", ".php", ".lua", ".r",
  ".sh", ".bash", ".zsh", ".fish", ".ps1",
  ".yaml", ".yml", ".toml", ".ini", ".cfg", ".conf",
  ".sql", ".graphql", ".gql", ".proto",
  ".css", ".scss", ".sass", ".less",
  ".xml", ".csv", ".vue", ".svelte",
  ".dart", ".ex", ".exs", ".erl", ".hs", ".clj", ".scala", ".tf",
]);

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
  if (ext === ".docx" || ext === ".doc") return "docx";
  if (ext === ".pptx" || ext === ".ppt" || ext === ".odp") return "pptx";
  if (IMAGE_EXTS.has(ext)) return "image";
  if (AUDIO_EXTS.has(ext)) return "audio";
  if (VIDEO_EXTS.has(ext)) return "video";
  if (CODE_EXTS.has(ext)) return "code";

  // Dockerfile and similar extensionless files by basename
  const name = basename(input).toLowerCase();
  if (name === "dockerfile" || name === "makefile" || name === "rakefile" || name === "gemfile") return "code";

  // Try to detect from content if file exists
  if (existsSync(input)) {
    return "text";
  }

  return "unknown";
}
