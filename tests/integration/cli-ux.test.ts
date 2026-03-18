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

describe("CLI usability", () => {
  test("help output leads with common commands", () => {
    const result = runCli(["--help"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Common commands:");
    expect(result.stdout).toContain('mda convert "https://example.com/article"');
    expect(result.stdout).toContain("mda examples");
  });

  test("examples command prints copy-paste snippets", () => {
    const result = runCli(["examples"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Copy-paste examples:");
    expect(result.stdout).toContain("mda ingest ./notes -o ./output -r");
    expect(result.stdout).toContain("mda doctor");
  });

  test("convert with no input prints guided error", () => {
    const result = runCli(["convert"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Missing input for convert command.");
    expect(result.stderr).toContain("Try this:");
    expect(result.stderr).toContain("mda convert tests/fixtures/sample.txt");
  });

  test("directory input points users to ingest", () => {
    const result = runCli(["tests/fixtures"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('"tests/fixtures" is a directory.');
    expect(result.stderr).toContain("Use ingest for folders.");
    expect(result.stderr).toContain("mda ingest tests/fixtures");
  });

  test("unknown input prints guidance without breaking fallback output", () => {
    const result = runCli(["definitely-not-a-real-input.custom"]);

    expect(result.status).toBe(0);
    expect(result.stderr).toContain('Could not detect a supported input type for "definitely-not-a-real-input.custom".');
    expect(result.stderr).toContain("mda --help or mda examples");
    expect(result.stdout).toContain("Unsupported input type: unknown");
  });

  test("doctor output matches the public support story", () => {
    const result = runCli(["doctor"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("mda doctor");
    expect(result.stdout).toContain("pdf                      — strong support");
    expect(result.stdout).toContain("Optional tools:");
  });
});
