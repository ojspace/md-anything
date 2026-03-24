import { expect, test, describe } from "bun:test";
import { join } from "node:path";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { ingestFolder } from "../../src/core/ingest";
import { DEFAULT_CONFIG } from "../../src/config/defaults";
import { createRuntimeProviders } from "../../src/core/runtime";

const runtime = createRuntimeProviders(DEFAULT_CONFIG);

describe("ingestFolder", () => {
  test("should convert text files in a directory", async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), "md-anything-ingest-"));
    try {
      await writeFile(join(tmpDir, "test1.txt"), "Hello from test file one.\nThis has good content for testing.");
      await writeFile(join(tmpDir, "test2.md"), "# Test Two\n\nThis is test file two with markdown.");

      const result = await ingestFolder(tmpDir, runtime, {});

      expect(result.converted).toBe(2);
      expect(result.docs.length).toBe(2);
      expect(result.docs.every((d) => d.metadata !== undefined)).toBe(true);
      expect(result.docs.every((d) => Array.isArray(d.chunks) && d.chunks.length > 0)).toBe(true);
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  test("should return structured result with counts", async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), "md-anything-ingest-"));
    try {
      await writeFile(join(tmpDir, "note.txt"), "content");

      const result = await ingestFolder(tmpDir, runtime, {});

      expect(result.converted).toBeGreaterThanOrEqual(1);
      expect(typeof result.skipped).toBe("number");
      expect(typeof result.failed).toBe("number");
      expect(Array.isArray(result.docs)).toBe(true);
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  test("deduplicates output file names for colliding basenames", async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), "md-anything-ingest-collisions-"));
    try {
      const nestedDir = join(tmpDir, "nested");
      await mkdir(nestedDir, { recursive: true });
      await writeFile(join(tmpDir, "notes.txt"), "Top level content that is long enough to convert.");
      await writeFile(join(nestedDir, "notes.md"), "# Nested\n\nNested content that is also long enough.");

      const result = await ingestFolder(tmpDir, runtime, { recursive: true });
      const fileNames = result.docs.map((doc) => doc.fileName).sort();

      expect(fileNames).toEqual(["notes-2.md", "notes.md"]);
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });
});
