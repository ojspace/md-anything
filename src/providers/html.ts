import { readFile } from "node:fs/promises";
import type { NormalizedDocument } from "../core/types";
import { htmlToMarkdown } from "../utils/html-to-markdown";
import { splitIntoSections } from "../utils/split-sections";

function extractTitle(html: string): string {
  // og:title takes priority
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
  if (og) return og[1].trim();

  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (title) return title[1].trim();

  return "HTML Document";
}

function extractOgDescription(html: string): string | undefined {
  const m = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i);
  return m ? m[1].trim() : undefined;
}

function buildDocument(html: string, source: string): NormalizedDocument {
  const title = extractTitle(html);
  const summary = extractOgDescription(html);
  const markdown = htmlToMarkdown(html);
  const sections = splitIntoSections(markdown);

  return {
    title,
    source,
    sourceType: "html",
    summary,
    sections,
    metadata: {
      extraction: "html-to-markdown",
      extraction_status: sections.length > 0 ? "ok" : "weak",
      section_count: sections.length,
    },
  };
}

export async function convertHtml(filePath: string): Promise<NormalizedDocument> {
  const content = await readFile(filePath, "utf-8");
  return buildDocument(content, filePath);
}

export async function convertHtmlContent(html: string, source: string): Promise<NormalizedDocument> {
  return buildDocument(html, source);
}
