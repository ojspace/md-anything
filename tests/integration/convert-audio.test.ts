import { expect, test, describe } from "bun:test";
import { join } from "node:path";
import { writeFile, mkdir } from "node:fs/promises";
import { convertAudio } from "../../src/providers/audio";

const TMP = join(import.meta.dir, "../tmp-audio-tests");

async function setup() {
  await mkdir(TMP, { recursive: true });
}

describe("audio conversion (baseline, no whisper required)", () => {
  test("detects audio kind for .mp3 files", async () => {
    const { detectInputKind } = await import("../../src/core/detect-input");
    expect(detectInputKind("test.mp3")).toBe("audio");
    expect(detectInputKind("test.wav")).toBe("audio");
    expect(detectInputKind("test.ogg")).toBe("audio");
    expect(detectInputKind("test.m4a")).toBe("audio");
    expect(detectInputKind("test.flac")).toBe("audio");
  });

  test("returns fallback when no whisper or API key", async () => {
    await setup();
    const audioPath = join(TMP, "test-audio.mp3");
    await writeFile(audioPath, Buffer.alloc(100));

    const doc = await convertAudio(audioPath, null, null, null);

    expect(doc.sourceType).toBe("audio");
    expect(doc.title).toBe("test-audio.mp3");
    expect(doc.metadata.extraction).toBe("unavailable");
    expect(doc.metadata.extraction_status).toBe("weak");
    expect(doc.metadata.whisper_available).toBe(false);
    expect(doc.metadata.low_confidence_output).toBe(true);
    expect(doc.sections.length).toBe(1);
    expect(doc.sections[0].content).toContain("Audio transcription requires");
    expect(doc.sections[0].content).toContain("whisper-cpp");
    expect(doc.sections[0].content).toContain("OPENROUTER_API_KEY");
  });

  test("returns fallback with whisper installed but no model", async () => {
    await setup();
    const audioPath = join(TMP, "test-audio-2.mp3");
    await writeFile(audioPath, Buffer.alloc(100));

    const doc = await convertAudio(audioPath, "whisper-cpp", null, null);

    expect(doc.sourceType).toBe("audio");
    expect(doc.metadata.whisper_available).toBe(true);
    expect(doc.metadata.whisper_backend).toBe("whisper-cpp");
    // whisper-cpp with no model path falls through to whisper python
    // which also fails since it's not installed — result is whisper-empty or unavailable
    expect(doc.metadata.extraction_status).toBe("weak");
  });

  test("audio metadata includes format and file size", async () => {
    await setup();
    const audioPath = join(TMP, "test-audio-3.wav");
    await writeFile(audioPath, Buffer.alloc(2048));

    const doc = await convertAudio(audioPath, null, null, null);

    expect(doc.metadata.file_name).toBe("test-audio-3.wav");
    expect(doc.metadata.file_size_bytes).toBe(2048);
    expect(doc.metadata.format).toBe("wav");
  });

  test("audio fallback includes actionable guidance", async () => {
    await setup();
    const audioPath = join(TMP, "no-tools.mp3");
    await writeFile(audioPath, Buffer.alloc(100));

    const doc = await convertAudio(audioPath, null, null, null);

    expect(doc.sections[0].content).toContain("brew install whisper-cpp");
    expect(doc.sections[0].content).toContain("whisper-cpp --download-model base.en");
    expect(doc.sections[0].content).toContain("OPENROUTER_API_KEY");
    expect(doc.sections[0].content).toContain("mda doctor");
  });

  test("audio conversion through pipeline", async () => {
    await setup();
    const audioPath = join(TMP, "pipeline-test.mp3");
    await writeFile(audioPath, Buffer.alloc(100));

    const { convertToMarkdown } = await import("../../src/core/convert");
    const { createRuntimeProviders } = await import("../../src/core/runtime");
    const { DEFAULT_CONFIG } = await import("../../src/config/defaults");

    const runtime = createRuntimeProviders(DEFAULT_CONFIG);
    const result = await convertToMarkdown(
      { input: audioPath, options: DEFAULT_CONFIG.options },
      runtime,
    );

    expect(result.kind).toBe("audio");
    expect(result.metadata.support_level).toBe("optional");
    expect(result.markdown).toBeDefined();
    expect(result.markdown.length).toBeGreaterThan(0);
  });
});
