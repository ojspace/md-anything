import { readFile } from "node:fs/promises";
import type { NormalizedDocument, Section } from "../core/types";

const HTML_ENTITIES: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  quot: '"',
  apos: "'",
  lt: "<",
  gt: ">",
};

function decodeEntities(text: string): string {
  return text.replace(/&([a-zA-Z]+|#\d+|#x[\da-fA-F]+);/g, (match, ref: string) => {
    if (ref.startsWith("#x")) return String.fromCharCode(parseInt(ref.slice(2), 16));
    if (ref.startsWith("#")) return String.fromCharCode(parseInt(ref.slice(1), 10));
    return HTML_ENTITIES[ref.toLowerCase()] ?? match;
  });
}

function stripHtml(html: string): string {
  const noTags = html.replace(/<[^>]+>/g, " ");
  return decodeEntities(noTags).replace(/\s+/g, " ").trim();
}

function extractTitle(html: string): string {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? m[1].trim() : "HTML Document";
}

function extractHeadings(html: string): Section[] {
  const sections: Section[] = [];
  const bodyRe = /<body[^>]*>([\s\S]*?)<\/body>/i;
  const bodyMatch = html.match(bodyRe);
  const body = bodyMatch ? bodyMatch[1] : html;
  
  const text = stripHtml(body);
  if (text) {
    sections.push({ content: text });
  }
  return sections;
}

export async function convertHtml(filePath: string): Promise<NormalizedDocument> {
  const content = await readFile(filePath, "utf-8");
  const title = extractTitle(content);
  const sections = extractHeadings(content);

  return {
    title,
    source: filePath,
    sourceType: "html",
    sections,
    metadata: {
      extraction: "html-strip",
      extraction_status: "ok",
    },
  };
}

export async function convertHtmlContent(html: string, source: string): Promise<NormalizedDocument> {
  const title = extractTitle(html);
  const sections = extractHeadings(html);

  return {
    title,
    source,
    sourceType: "html",
    sections,
    metadata: {
      extraction: "html-strip",
      extraction_status: sections.length > 0 && sections[0].content.length > 100 ? "ok" : "weak",
    },
  };
}
