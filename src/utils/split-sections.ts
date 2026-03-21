import type { Section } from "../core/types.ts";

const MIN_CONTENT_LENGTH = 10;

/**
 * Splits a Markdown string into structured sections at heading boundaries.
 * Each section captures the heading text and all content until the next heading.
 * Sections with insufficient content are filtered out.
 */
export function splitIntoSections(markdown: string): Section[] {
  const lines = markdown.split("\n");
  const sections: Section[] = [];
  let activeHeadingPath: string[] = [];
  let currentHeading: string | undefined;
  let currentHeadingPath: string[] = [];
  let currentLines: string[] = [];

  function flush(): void {
    const content = currentLines.join("\n").trim();
    if (content.length >= MIN_CONTENT_LENGTH) {
      sections.push({
        heading: currentHeading,
        content,
        ...(currentHeadingPath.length > 0 ? { provenance: { headingPath: [...currentHeadingPath] } } : {}),
      });
    }
    currentHeading = undefined;
    currentHeadingPath = [];
    currentLines = [];
  }

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      flush();
      const level = headingMatch[1].length;
      const headingText = headingMatch[2].trim();
      currentHeading = headingText;
      activeHeadingPath = [...activeHeadingPath.slice(0, Math.max(0, level - 1)), headingText];
      currentHeadingPath = [...activeHeadingPath];
    } else {
      currentLines.push(line);
    }
  }

  flush();

  // If no sections were produced (no headings found), return whole doc as one section
  if (sections.length === 0 && markdown.trim().length >= MIN_CONTENT_LENGTH) {
    return [{ content: markdown.trim() }];
  }

  return sections;
}
