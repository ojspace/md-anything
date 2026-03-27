import { readFile, stat } from "node:fs/promises";
import { basename, extname } from "node:path";
import type { NormalizedDocument } from "../core/types";

const LANG_MAP: Record<string, string> = {
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  jsx: "jsx",
  mjs: "javascript",
  cjs: "javascript",
  py: "python",
  rb: "ruby",
  go: "go",
  rs: "rust",
  java: "java",
  kt: "kotlin",
  kts: "kotlin",
  cs: "csharp",
  cpp: "cpp",
  cc: "cpp",
  cxx: "cpp",
  c: "c",
  h: "c",
  hpp: "cpp",
  swift: "swift",
  php: "php",
  lua: "lua",
  r: "r",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  fish: "fish",
  ps1: "powershell",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  ini: "ini",
  cfg: "ini",
  conf: "nginx",
  sql: "sql",
  graphql: "graphql",
  gql: "graphql",
  proto: "protobuf",
  css: "css",
  scss: "scss",
  sass: "sass",
  less: "less",
  xml: "xml",
  csv: "csv",
  vue: "vue",
  svelte: "svelte",
  dart: "dart",
  ex: "elixir",
  exs: "elixir",
  erl: "erlang",
  hs: "haskell",
  clj: "clojure",
  scala: "scala",
  tf: "hcl",
  dockerfile: "dockerfile",
};

export async function convertCode(filePath: string): Promise<NormalizedDocument> {
  const content = await readFile(filePath, "utf-8");
  const name = basename(filePath);
  const rawExt = extname(filePath).toLowerCase().replace(".", "");
  const lang = LANG_MAP[rawExt] ?? rawExt;

  let fileSize = 0;
  try {
    const s = await stat(filePath);
    fileSize = s.size;
  } catch {
    // ignore
  }

  const lines = content.split("\n");
  const codeBlock = `\`\`\`${lang}\n${content.trimEnd()}\n\`\`\``;

  return {
    title: name,
    source: filePath,
    sourceType: "code",
    sections: [{ content: codeBlock }],
    metadata: {
      extraction: "code",
      extraction_status: "ok",
      language: lang,
      file_name: name,
      file_size_bytes: fileSize,
      line_count: lines.length,
      char_count: content.length,
    },
  };
}
