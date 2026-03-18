import { expect, test, describe } from "bun:test";
import { INPUT_SUPPORT_LEVELS } from "../../src/core/support-levels";
import type { InputKind } from "../../src/core/types";

describe("INPUT_SUPPORT_LEVELS", () => {
  test("strong support for text/html/url/json/markdown", () => {
    const strongKinds: InputKind[] = ["text", "markdown", "json", "html", "url"];
    for (const kind of strongKinds) {
      expect(INPUT_SUPPORT_LEVELS[kind]).toBe("strong");
    }
  });

  test("strong support for pdf (unpdf zero-dep extraction)", () => {
    expect(INPUT_SUPPORT_LEVELS["pdf"]).toBe("strong");
  });

  test("best-effort support for image/youtube/epub/mobi", () => {
    const bestEffortKinds: InputKind[] = ["youtube", "image", "epub", "mobi"];
    for (const kind of bestEffortKinds) {
      expect(INPUT_SUPPORT_LEVELS[kind]).toBe("best-effort");
    }
  });

  test("optional support for audio/video/unknown", () => {
    const optionalKinds: InputKind[] = ["audio", "video", "unknown"];
    for (const kind of optionalKinds) {
      expect(INPUT_SUPPORT_LEVELS[kind]).toBe("optional");
    }
  });

  test("all InputKind values have a support level", () => {
    const allKinds: InputKind[] = [
      "text", "markdown", "json", "html", "url",
      "youtube", "image", "pdf", "epub", "mobi",
      "audio", "video", "unknown",
    ];
    for (const kind of allKinds) {
      expect(INPUT_SUPPORT_LEVELS[kind]).toBeDefined();
    }
  });
});
