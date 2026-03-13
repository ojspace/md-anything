import { readFile } from "node:fs/promises";
import type { NormalizedDocument, Section } from "../core/types";

export async function convertText(filePath: string): Promise<NormalizedDocument> {
  const content = await readFile(filePath, "utf-8");
  const lines = content.trim().split("\n");
  const title = lines[0]?.trim() || filePath;

  const sections: Section[] = [{ content: content.trim() }];

  return {
    title,
    source: filePath,
    sourceType: "text",
    sections,
    metadata: {
      extraction: "text",
      extraction_status: "ok",
      char_count: content.length,
      line_count: lines.length,
    },
  };
}

export async function convertMarkdown(filePath: string): Promise<NormalizedDocument> {
  const content = await readFile(filePath, "utf-8");
  const lines = content.trim().split("\n");

  let title = filePath;
  for (const line of lines) {
    if (line.startsWith("# ")) {
      title = line.slice(2).trim();
      break;
    }
  }

  const sections: Section[] = [{ content: content.trim() }];

  return {
    title,
    source: filePath,
    sourceType: "markdown",
    sections,
    metadata: {
      extraction: "passthrough",
      extraction_status: "ok",
      char_count: content.length,
    },
  };
}

export async function convertJson(filePath: string): Promise<NormalizedDocument> {
  const raw = await readFile(filePath, "utf-8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = raw;
  }

  const content = "```json\n" + JSON.stringify(parsed, null, 2) + "\n```";

  return {
    title: filePath,
    source: filePath,
    sourceType: "json",
    sections: [{ content }],
    metadata: {
      extraction: "json-parse",
      extraction_status: "ok",
    },
  };
}
