const HTML_ENTITIES: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  quot: '"',
  apos: "'",
  lt: "<",
  gt: ">",
  mdash: "—",
  ndash: "–",
  lsquo: "\u2018",
  rsquo: "\u2019",
  ldquo: "\u201C",
  rdquo: "\u201D",
  hellip: "…",
  bull: "•",
  copy: "©",
  reg: "®",
  trade: "™",
};

// Pre-compiled heading patterns (h1–h6), avoids RegExp construction on each call
const HEADING_RES: RegExp[] = [1, 2, 3, 4, 5, 6].map(
  (i) => new RegExp(`<h${i}[^>]*>([\\s\\S]*?)<\\/h${i}>`, "gi"),
);

export function decodeEntities(text: string): string {
  return text.replace(/&([a-zA-Z]+|#\d+|#x[\da-fA-F]+);/g, (match, ref: string) => {
    if (ref.startsWith("#x")) return String.fromCharCode(parseInt(ref.slice(2), 16));
    if (ref.startsWith("#")) return String.fromCharCode(parseInt(ref.slice(1), 10));
    return HTML_ENTITIES[ref.toLowerCase()] ?? match;
  });
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function convertTable(tableHtml: string): string {
  const rows: string[][] = [];
  let headerRowIndex = -1;
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  let rowIdx = 0;

  while ((rowMatch = rowRe.exec(tableHtml)) !== null) {
    const rowHtml = rowMatch[1];
    const cells: string[] = [];
    const cellRe = /<t([dh])[^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let cellMatch;
    let isHeaderRow = false;

    while ((cellMatch = cellRe.exec(rowHtml)) !== null) {
      if (cellMatch[1] === "h") isHeaderRow = true;
      cells.push(stripTags(cellMatch[2]).replace(/\|/g, "\\|").trim());
    }

    if (cells.length > 0) {
      if (isHeaderRow && headerRowIndex === -1) headerRowIndex = rowIdx;
      rows.push(cells);
      rowIdx++;
    }
  }

  if (rows.length === 0) return "";

  const colCount = Math.max(...rows.map((r) => r.length));
  const effectiveHeader = headerRowIndex >= 0 ? headerRowIndex : 0;
  const lines: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = [...rows[i]];
    while (row.length < colCount) row.push("");
    lines.push(`| ${row.join(" | ")} |`);
    if (i === effectiveHeader) {
      lines.push(`|${Array(colCount).fill(" --- ").join("|")}|`);
    }
  }

  return lines.join("\n");
}

/**
 * Converts an HTML string to clean Markdown, preserving document structure.
 * Removes noise (scripts, nav, footer), converts headings, lists, tables,
 * code blocks, and inline formatting.
 */
export function htmlToMarkdown(html: string): string {
  let s = html;

  // Remove noise blocks entirely
  s = s.replace(/<script[\s\S]*?<\/script>/gi, "");
  s = s.replace(/<style[\s\S]*?<\/style>/gi, "");
  s = s.replace(/<!--[\s\S]*?-->/g, "");
  s = s.replace(/<nav[\s\S]*?<\/nav>/gi, "");
  s = s.replace(/<footer[\s\S]*?<\/footer>/gi, "");
  s = s.replace(/<aside[\s\S]*?<\/aside>/gi, "");
  s = s.replace(/<form[\s\S]*?<\/form>/gi, "");

  // Pre/code blocks (before other tag processing to preserve whitespace)
  s = s.replace(/<pre[^>]*>[\s\S]*?<code[^>]*>([\s\S]*?)<\/code>[\s\S]*?<\/pre>/gi, (_, code) => {
    const content = decodeEntities(code.replace(/<[^>]+>/g, ""));
    return `\n\n\`\`\`\n${content}\n\`\`\`\n\n`;
  });
  s = s.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_, code) => {
    const content = decodeEntities(code.replace(/<[^>]+>/g, ""));
    return `\n\n\`\`\`\n${content}\n\`\`\`\n\n`;
  });

  // Tables (before heading processing)
  s = s.replace(/<table[\s\S]*?<\/table>/gi, (table) => {
    const md = convertTable(table);
    return md ? `\n\n${md}\n\n` : "\n\n";
  });

  // Headings h1–h6 (HEADING_RES[0]=h1 … HEADING_RES[5]=h6; process h6 first to avoid nesting issues)
  for (let i = 6; i >= 1; i--) {
    const hashes = "#".repeat(i);
    s = s.replace(HEADING_RES[i - 1], (_, inner) => {
      const text = stripTags(inner).trim();
      return text ? `\n\n${hashes} ${text}\n\n` : "";
    });
  }

  // Blockquotes
  s = s.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, inner) => {
    const text = stripTags(inner).trim();
    if (!text) return "";
    const quoted = text
      .split("\n")
      .map((l) => `> ${l}`)
      .join("\n");
    return `\n\n${quoted}\n\n`;
  });

  // Unordered lists
  s = s.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, inner) => {
    const items: string[] = [];
    const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    let m;
    while ((m = liRe.exec(inner)) !== null) {
      const text = stripTags(m[1]).replace(/\s+/g, " ").trim();
      if (text) items.push(`- ${text}`);
    }
    return items.length ? `\n\n${items.join("\n")}\n\n` : "";
  });

  // Ordered lists
  s = s.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, inner) => {
    const items: string[] = [];
    const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    let m;
    let n = 1;
    while ((m = liRe.exec(inner)) !== null) {
      const text = stripTags(m[1]).replace(/\s+/g, " ").trim();
      if (text) {
        items.push(`${n}. ${text}`);
        n++;
      }
    }
    return items.length ? `\n\n${items.join("\n")}\n\n` : "";
  });

  // Links
  s = s.replace(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, inner) => {
    const text = stripTags(inner).trim();
    if (!text) return "";
    if (/^(javascript:|#)/.test(href)) return text;
    return `[${text}](${href})`;
  });

  // Images (render as alt text)
  s = s.replace(/<img[^>]*alt=["']([^"']*)["'][^>]*\/?>/gi, (_, alt) => (alt ? `![${alt}]` : ""));
  s = s.replace(/<img[^>]*\/?>/gi, "");

  // Inline formatting
  s = s.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/(strong|b)>/gi, (_, _t, inner) => {
    const text = stripTags(inner).trim();
    return text ? `**${text}**` : "";
  });
  s = s.replace(/<(em|i)[^>]*>([\s\S]*?)<\/(em|i)>/gi, (_, _t, inner) => {
    const text = stripTags(inner).trim();
    return text ? `*${text}*` : "";
  });
  s = s.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_, inner) => {
    const text = decodeEntities(inner.replace(/<[^>]+>/g, "")).trim();
    return text ? `\`${text}\`` : "";
  });

  // Paragraphs
  s = s.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, inner) => {
    const text = stripTags(inner).replace(/\s+/g, " ").trim();
    return text ? `\n\n${text}\n\n` : "";
  });

  // Block containers → newlines
  s = s.replace(/<\/?(?:div|section|article|main)[^>]*>/gi, "\n");

  // Line breaks and horizontal rules
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<hr\s*\/?>/gi, "\n\n---\n\n");

  // Strip remaining tags
  s = s.replace(/<[^>]+>/g, " ");

  // Decode remaining entities
  s = decodeEntities(s);

  // Normalize whitespace
  s = s.replace(/[ \t]+/g, " ");
  s = s.replace(/\n[ \t]+/g, "\n");
  s = s.replace(/\n{3,}/g, "\n\n");

  return s.trim();
}
