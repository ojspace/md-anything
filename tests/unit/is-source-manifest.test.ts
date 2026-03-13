import { expect, test, describe } from "bun:test";
import { isSourceManifest } from "../../src/core/is-source-manifest";

describe("isSourceManifest", () => {
  test("detects sources.txt", () => {
    expect(isSourceManifest("sources.txt")).toBe(true);
    expect(isSourceManifest("/path/to/sources.txt")).toBe(true);
    expect(isSourceManifest("my.sources.txt")).toBe(true);
  });

  test("detects sources.json", () => {
    expect(isSourceManifest("sources.json")).toBe(true);
    expect(isSourceManifest("/path/to/sources.json")).toBe(true);
    expect(isSourceManifest("my.sources.json")).toBe(true);
  });

  test("does not detect regular files", () => {
    expect(isSourceManifest("sample.txt")).toBe(false);
    expect(isSourceManifest("data.json")).toBe(false);
    expect(isSourceManifest("readme.md")).toBe(false);
  });
});
