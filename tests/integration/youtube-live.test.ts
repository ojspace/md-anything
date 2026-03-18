/**
 * Live YouTube regression test.
 * Skipped unless LIVE_TESTS=1 is set in the environment.
 *
 * Run with: LIVE_TESTS=1 bun test tests/integration/youtube-live.test.ts
 */

import { describe, it, expect } from "bun:test";
import { convertToMarkdown } from "../../src/core/convert";
import { createRuntimeProviders } from "../../src/core/runtime";
import { DEFAULT_CONFIG } from "../../src/config/defaults";

const LIVE = process.env.LIVE_TESTS === "1";
const TARGET_URL = "https://www.youtube.com/watch?v=EqhKw0Oro_k";

describe.if(LIVE)("YouTube live regression", () => {
  const runtime = createRuntimeProviders(DEFAULT_CONFIG);

  it("should return non-empty markdown for a real YouTube URL", async () => {
    const result = await convertToMarkdown(
      { input: TARGET_URL, options: { ...DEFAULT_CONFIG.options, frontmatter: false } },
      runtime,
    );

    expect(result.kind).toBe("youtube");
    expect(result.markdown.length).toBeGreaterThan(100);
  }, 30000);

  it("should include a title in the output", async () => {
    const result = await convertToMarkdown(
      { input: TARGET_URL, options: { ...DEFAULT_CONFIG.options, frontmatter: true } },
      runtime,
    );

    expect(result.markdown).toContain("title:");
  }, 30000);

  it("should report a usefulness_score > 0", async () => {
    const result = await convertToMarkdown(
      { input: TARGET_URL, options: { ...DEFAULT_CONFIG.options } },
      runtime,
    );

    expect(result.metadata.usefulness_score).toBeGreaterThan(0);
  }, 30000);
});

describe.if(!LIVE)("YouTube live regression (skipped)", () => {
  it("is skipped — set LIVE_TESTS=1 to run", () => {
    // Intentionally empty: these tests require network access and a real YouTube URL.
  });
});
