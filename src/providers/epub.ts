import { stat } from "node:fs/promises";
import { basename } from "node:path";
import type { NormalizedDocument, Section } from "../core/types";
import { htmlToMarkdown } from "../utils/html-to-markdown";
import { splitIntoSections } from "../utils/split-sections";

async function parseEpub(filePath: string): Promise<{ title: string; sections: Section[] } | null> {
  try {
    const { spawnSync } = await import("node:child_process");
    
    const listResult = spawnSync("unzip", ["-l", filePath], { encoding: "utf-8" });
    if (listResult.status !== 0) return null;
    
    const files = listResult.stdout
      .split("\n")
      .filter((l) => l.match(/\.(xhtml|html|htm|opf|ncx|xml)$/i))
      .map((l) => l.trim().split(/\s+/).pop() || "")
      .filter(Boolean);

    let opfPath = "";
    if (files.includes("META-INF/container.xml")) {
      const containerResult = spawnSync("unzip", ["-p", filePath, "META-INF/container.xml"], { encoding: "utf-8" });
      if (containerResult.status === 0) {
        const m = containerResult.stdout.match(/full-path="([^"]+\.opf)"/i);
        if (m) opfPath = m[1];
      }
    }

    let spineItems: string[] = [];
    let title = "";
    if (opfPath) {
      const opfResult = spawnSync("unzip", ["-p", filePath, opfPath], { encoding: "utf-8" });
      if (opfResult.status === 0) {
        const opfContent = opfResult.stdout;
        
        const titleMatch = opfContent.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/i);
        if (titleMatch) title = titleMatch[1].trim();
        
        const manifestItems: Record<string, string> = {};
        // Match each <item ...> element and extract id/href in any order
        const itemRe = /<item\s+([^>]+)(?:\/>|>)/gi;
        let m: RegExpExecArray | null;
        while ((m = itemRe.exec(opfContent)) !== null) {
          const attrs = m[1];
          const idMatch = attrs.match(/\bid="([^"]+)"/i);
          const hrefMatch = attrs.match(/\bhref="([^"]+)"/i);
          if (idMatch && hrefMatch) manifestItems[idMatch[1]] = hrefMatch[1];
        }
        
        const spineRe = /<itemref\s+idref="([^"]+)"/gi;
        while ((m = spineRe.exec(opfContent)) !== null) {
          const href = manifestItems[m[1]];
          if (href) spineItems.push(href);
        }
        
        if (spineItems.length === 0) {
          spineItems = Object.values(manifestItems).filter(
            (h) => h.match(/\.(xhtml|html|htm)$/i)
          );
        }
      }
    }

    if (spineItems.length === 0) {
      spineItems = files.filter((f) => f.match(/\.(xhtml|html|htm)$/i));
    }

    if (spineItems.length === 0) return null;

    const opfDir = opfPath ? opfPath.replace(/[^/]+$/, "") : "";

    const sections: Section[] = [];
    // Limit to 20 spine items to avoid excessive processing for very large EPUBs
    for (const item of spineItems.slice(0, 20)) {
      const fullPath = opfDir ? `${opfDir}${item}` : item;
      const xhtmlResult = spawnSync("unzip", ["-p", filePath, fullPath], { encoding: "utf-8" });
      if (xhtmlResult.status !== 0) continue;
      
      const html = xhtmlResult.stdout;
      if (!html.trim()) continue;
      
      const markdown = htmlToMarkdown(html);
      if (markdown.length <= 20) continue;

      const chapterSections = splitIntoSections(markdown);
      if (chapterSections.length > 0) {
        sections.push(...chapterSections);
      }
    }

    if (sections.length === 0) return null;

    return { title: title || "EPUB Document", sections };
  } catch {
    return null;
  }
}

export async function convertEpub(filePath: string): Promise<NormalizedDocument> {
  const name = basename(filePath);
  let fileSize = 0;

  try {
    const s = await stat(filePath);
    fileSize = s.size;
  } catch {
    // ignore
  }

  const parsed = await parseEpub(filePath);

  if (parsed && parsed.sections.length > 0) {
    return {
      title: parsed.title,
      source: filePath,
      sourceType: "epub",
      sections: parsed.sections,
      metadata: {
        extraction: "epub-native",
        extraction_status: "ok",
        file_name: name,
        file_size_bytes: fileSize,
        section_count: parsed.sections.length,
      },
    };
  }

  return {
    title: name,
    source: filePath,
    sourceType: "epub",
    sections: [
      {
        heading: "EPUB Document",
        content:
          `*File: ${name}*\n\nCould not extract readable sections from this EPUB. ` +
          "The file may be encrypted, malformed, image-only, or missing the unzip support used for EPUB extraction.\n\n" +
          "Run `mda doctor` to verify optional tool support and try another EPUB if the file looks suspicious.",
      },
    ],
    metadata: {
      extraction: "epub-failed",
      extraction_status: "weak",
      file_name: name,
      file_size_bytes: fileSize,
      low_confidence_output: true,
    },
  };
}
