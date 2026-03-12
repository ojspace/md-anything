import { readFile } from "node:fs/promises";

export async function readSourceManifest(filePath: string): Promise<string[]> {
  const content = await readFile(filePath, "utf-8");

  if (filePath.endsWith(".json")) {
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return parsed.filter((s): s is string => typeof s === "string" && s.trim().length > 0);
      }
      if (typeof parsed === "object" && parsed !== null && "sources" in parsed) {
        const sources = (parsed as Record<string, unknown>)["sources"];
        if (Array.isArray(sources)) {
          return sources.filter((s): s is string => typeof s === "string" && s.trim().length > 0);
        }
      }
    } catch {
      // fall through to line-based parsing
    }
  }

  return content
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));
}
