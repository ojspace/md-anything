import type { InputKind } from "./types";

export type SupportLevel = "strong" | "best-effort" | "optional";

export const INPUT_SUPPORT_LEVELS: Record<InputKind, SupportLevel> = {
  text: "strong",
  markdown: "strong",
  json: "strong",
  html: "strong",
  url: "strong",
  youtube: "best-effort",
  image: "best-effort",
  pdf: "strong",
  epub: "best-effort",
  mobi: "best-effort",
  audio: "optional",
  video: "optional",
  code: "strong",
  docx: "strong",
  pptx: "best-effort",
  unknown: "optional",
};
