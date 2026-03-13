/**
 * Live URL regression test.
 * Skipped unless LIVE_TESTS=1 is set in the environment.
 *
 * Run with: LIVE_TESTS=1 bun test tests/integration/url-live.test.ts
 */

import { describe, it, expect } from "bun:test";
import { convertToMarkdown } from "../../src/core/convert";
import { createRuntimeProviders } from "../../src/core/runtime";
import { DEFAULT_CONFIG } from "../../src/config/defaults";

const LIVE = process.env.LIVE_TESTS === "1";
const TARGET_URL = "https://edition.cnn.com/travel/japan-seto-inland-sea-shimanami-kaido";

describe.if(LIVE)("URL live regression (CNN)", () => {
  const runtime = createRuntimeProviders(DEFAULT_CONFIG);

  it("should return non-empty markdown for a real URL", async () => {
    const result = await convertToMarkdown(
      { input: TARGET_URL, options: { ...DEFAULT_CONFIG.options, frontmatter: false } },
      runtime,
    );

    expect(result.kind).toBe("url");
    expect(result.markdown.length).toBeGreaterThan(200);
  }, 30000);

  it("should extract article text, not just HTML tags", async () => {
    const result = await convertToMarkdown(
      { input: TARGET_URL, options: { ...DEFAULT_CONFIG.options, frontmatter: false } },
      runtime,
    );

    // Should have meaningful word content, not just markup
    const words = result.markdown.split(/\s+/).filter((w) => w.length > 3);
    expect(words.length).toBeGreaterThan(50);
  }, 30000);

  it("should report source_type as url", async () => {
    const result = await convertToMarkdown(
      { input: TARGET_URL, options: { ...DEFAULT_CONFIG.options } },
      runtime,
    );

    expect(result.kind).toBe("url");
    expect(result.metadata.usefulness_score).toBeGreaterThan(0);
  }, 30000);
});

describe.if(!LIVE)("URL live regression (skipped)", () => {
  it("is skipped — set LIVE_TESTS=1 to run", () => {
    // Intentionally empty: these tests require network access.
  });
});
