import { stat } from "node:fs/promises";
import { basename } from "node:path";
import type { NormalizedDocument } from "../core/types";
import { htmlToMarkdown } from "../utils/html-to-markdown";
import { splitIntoSections } from "../utils/split-sections";

interface MammothResult {
  value: string;
  messages: { type: string; message: string }[];
}

interface MammothModule {
  convertToHtml(options: { path: string }): Promise<MammothResult>;
}

function emptyDoc(name: string, filePath: string, fileSize: number): NormalizedDocument {
  return {
    title: name,
    source: filePath,
    sourceType: "docx",
    sections: [
      {
        heading: "Word Document",
        content: `*File: ${name}*\n\nNo readable content was extracted from this document.`,
      },
    ],
    metadata: {
      extraction: "mammoth-empty",
      extraction_status: "weak",
      file_name: name,
      file_size_bytes: fileSize,
    },
  };
}

export async function convertDocx(filePath: string): Promise<NormalizedDocument> {
  const name = basename(filePath);
  let fileSize = 0;

  try {
    const s = await stat(filePath);
    fileSize = s.size;
  } catch {
    // ignore
  }

  try {
    const mod = await import("mammoth");
    // Handle both CJS default export and named export (Bun ESM/CJS interop)
    const api = ((mod as unknown as { default?: MammothModule }) .default ?? mod) as MammothModule;
    const result = await api.convertToHtml({ path: filePath });

    if (!result.value || result.value.trim().length < 10) {
      return emptyDoc(name, filePath, fileSize);
    }

    const markdown = htmlToMarkdown(result.value);
    const sections = splitIntoSections(markdown);

    // Use first heading as document title
    let title = name;
    for (const section of sections) {
      if (section.heading) {
        title = section.heading;
        break;
      }
    }

    return {
      title,
      source: filePath,
      sourceType: "docx",
      sections,
      metadata: {
        extraction: "mammoth",
        extraction_status: sections.length > 0 ? "ok" : "weak",
        file_name: name,
        file_size_bytes: fileSize,
        section_count: sections.length,
        mammoth_messages: result.messages.length,
      },
    };
  } catch {
    return emptyDoc(name, filePath, fileSize);
  }
}
