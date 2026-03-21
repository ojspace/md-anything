import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "../..");

function runCli(args: string[]) {
  return spawnSync("bun", ["run", "src/cli.ts", ...args], {
    cwd: ROOT,
    encoding: "utf-8",
  });
}

describe("CLI JSON contract", () => {
  test("convert --json returns stable machine-readable fields", () => {
    const result = runCli(["convert", "tests/fixtures/sample.txt", "--json"]);

    expect(result.status).toBe(0);
    expect(result.stderr.trim()).toBe("");

    const parsed = JSON.parse(result.stdout);
    expect(parsed.input).toContain("tests/fixtures/sample.txt");
    expect(parsed.kind).toBe("text");
    expect(parsed.supportLevel).toBe("strong");
    expect(typeof parsed.markdown).toBe("string");
    expect(parsed.metadata.extraction_status).toBe("ok");
    expect(typeof parsed.metadata.document_id).toBe("string");
    expect(typeof parsed.provenance?.documentId).toBe("string");
    expect(Array.isArray(parsed.chunks)).toBe(true);
    expect(parsed.chunks.length).toBeGreaterThan(0);
    expect(Array.isArray(parsed.warnings)).toBe(true);
  });

  test("ingest --json returns docs with metadata", () => {
    const result = runCli(["ingest", "tests/fixtures", "--json"]);

    expect(result.status).toBe(0);
    expect(result.stderr.trim()).toBe("");

    const parsed = JSON.parse(result.stdout);
    expect(typeof parsed.converted).toBe("number");
    expect(typeof parsed.skipped).toBe("number");
    expect(typeof parsed.failed).toBe("number");
    expect(Array.isArray(parsed.docs)).toBe(true);
    expect(parsed.docs.length).toBeGreaterThan(0);
    expect(parsed.docs[0]?.metadata).toBeDefined();
    expect(typeof parsed.docs[0]?.metadata?.document_id).toBe("string");
    expect(typeof parsed.docs[0]?.provenance?.documentId).toBe("string");
    expect(Array.isArray(parsed.docs[0]?.chunks)).toBe(true);
  });

  test("convert --json with missing input returns structured error", () => {
    const result = runCli(["convert", "--json"]);

    expect(result.status).toBe(1);
    expect(result.stderr.trim()).toBe("");

    const parsed = JSON.parse(result.stdout);
    expect(parsed.code).toBe("missing_input");
    expect(parsed.error).toContain("Missing input");
    expect(Array.isArray(parsed.examples)).toBe(true);
  });

  test("directory input with --json returns structured error", () => {
    const result = runCli(["tests/fixtures", "--json"]);

    expect(result.status).toBe(1);
    expect(result.stderr.trim()).toBe("");

    const parsed = JSON.parse(result.stdout);
    expect(parsed.code).toBe("directory_input");
    expect(parsed.error).toContain("is a directory");
    expect(parsed.suggestion).toContain("mda ingest");
  });

  test("weak or unknown results keep JSON clean and attach warnings", () => {
    const result = runCli(["definitely-not-a-real-input.custom", "--json"]);

    expect(result.status).toBe(0);
    expect(result.stderr.trim()).toBe("");

    const parsed = JSON.parse(result.stdout);
    expect(parsed.kind).toBe("unknown");
    expect(Array.isArray(parsed.warnings)).toBe(true);
    expect(parsed.warnings.some((warning: string) => warning.includes("supported input type"))).toBe(true);
    expect(typeof parsed.markdown).toBe("string");
  });
});
