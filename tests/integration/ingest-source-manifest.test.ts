import { expect, test, describe } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { ingestFolder } from "../../src/core/ingest";
import { DEFAULT_CONFIG } from "../../src/config/defaults";
import { createRuntimeProviders } from "../../src/core/runtime";
import { readSourceManifest } from "../../src/core/source-manifest";
import { isSourceManifest } from "../../src/core/is-source-manifest";

const runtime = createRuntimeProviders(DEFAULT_CONFIG);
const FIXTURES = join(import.meta.dir, "../fixtures");

describe("source manifest support", () => {
  test("readSourceManifest parses .txt manifest", async () => {
    const sources = await readSourceManifest(join(FIXTURES, "sources.txt"));
    expect(Array.isArray(sources)).toBe(true);
    expect(sources.length).toBeGreaterThan(0);
    expect(sources.some((s) => s.includes("sample.txt") || s.includes("sample.md"))).toBe(true);
  });

  test("readSourceManifest parses .json manifest", async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), "md-anything-test-"));
    try {
      const manifestPath = join(tmpDir, "sources.json");
      await writeFile(manifestPath, JSON.stringify(["tests/fixtures/sample.txt", "tests/fixtures/sample.md"]));
      
      const sources = await readSourceManifest(manifestPath);
      expect(sources).toContain("tests/fixtures/sample.txt");
      expect(sources).toContain("tests/fixtures/sample.md");
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  test("readSourceManifest ignores comment lines", async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), "md-anything-test-"));
    try {
      const manifestPath = join(tmpDir, "sources.txt");
      await writeFile(manifestPath, "# this is a comment\ntests/fixtures/sample.txt\n\n# another comment\ntests/fixtures/sample.md\n");
      
      const sources = await readSourceManifest(manifestPath);
      expect(sources).not.toContain("# this is a comment");
      expect(sources).not.toContain("");
      expect(sources.length).toBe(2);
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  test("ingestFolder processes text files without manifest", async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), "md-anything-ingest-"));
    try {
      await writeFile(join(tmpDir, "test1.txt"), "Hello from test file one.\nThis has good content for testing.");
      await writeFile(join(tmpDir, "test2.md"), "# Test Two\n\nThis is test file two with markdown.");
      
      const result = await ingestFolder(tmpDir, runtime, {});
      
      expect(result.converted).toBe(2);
      expect(result.docs.length).toBe(2);
      expect(result.docs.every((d) => d.metadata !== undefined)).toBe(true);
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });
});
