import { describe, expect, test } from "bun:test";
import { buildDoctorMarkdown } from "../../src/core/doctor";

describe("doctor markdown", () => {
  test("lists unzip as the EPUB capability dependency", () => {
    const markdown = buildDoctorMarkdown({
      hasTesseract: false,
      hasPdftotext: false,
      hasEbookConvert: false,
      hasUnzip: false,
      hasFfmpeg: false,
      hasWhisper: false,
      whisperBackend: null,
      whisperCppModelPath: null,
      hasPlaywright: false,
      openRouterApiKey: null,
    });

    expect(markdown).toContain("unzip — EPUB extraction");
    expect(markdown).toContain("ebook-convert — MOBI/ebook conversion");
    expect(markdown).toContain("ffmpeg — media extraction for transcription");
  });
});
