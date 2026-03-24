import { expect, test, describe } from "bun:test";
import { join } from "node:path";
import { writeFile, mkdir } from "node:fs/promises";
import { convertVideo } from "../../src/providers/video";

const TMP = join(import.meta.dir, "../tmp-video-tests");

async function setup() {
  await mkdir(TMP, { recursive: true });
}

describe("video conversion (baseline, no whisper/ffmpeg required)", () => {
  test("detects video kind for .mp4 files", async () => {
    const { detectInputKind } = await import("../../src/core/detect-input");
    expect(detectInputKind("test.mp4")).toBe("video");
    expect(detectInputKind("test.mov")).toBe("video");
    expect(detectInputKind("test.avi")).toBe("video");
    expect(detectInputKind("test.mkv")).toBe("video");
    expect(detectInputKind("test.webm")).toBe("video");
  });

  test("returns fallback when no whisper, ffmpeg, or API key", async () => {
    await setup();
    const videoPath = join(TMP, "test-video.mp4");
    await writeFile(videoPath, Buffer.alloc(100));

    const doc = await convertVideo(videoPath, null, null, false, null);

    expect(doc.sourceType).toBe("video");
    expect(doc.title).toBe("test-video.mp4");
    expect(doc.metadata.extraction).toBe("unavailable");
    expect(doc.metadata.extraction_status).toBe("weak");
    expect(doc.metadata.low_confidence_output).toBe(true);
    expect(doc.sections.length).toBe(1);
    expect(doc.sections[0].content).toContain("Video transcription requires");
  });

  test("video metadata includes format and file size", async () => {
    await setup();
    const videoPath = join(TMP, "test-video-2.mov");
    await writeFile(videoPath, Buffer.alloc(4096));

    const doc = await convertVideo(videoPath, null, null, false, null);

    expect(doc.metadata.file_name).toBe("test-video-2.mov");
    expect(doc.metadata.file_size_bytes).toBe(4096);
    expect(doc.metadata.format).toBe("mov");
    expect(doc.metadata.ffmpeg_available).toBeDefined();
    expect(doc.metadata.whisper_available).toBe(false);
  });

  test("video fallback includes actionable guidance", async () => {
    await setup();
    const videoPath = join(TMP, "no-tools.mp4");
    await writeFile(videoPath, Buffer.alloc(100));

    const doc = await convertVideo(videoPath, null, null, false, null);

    expect(doc.sections[0].content).toContain("Video transcription requires");
    // ffmpeg may or may not be installed on the test machine
    // the fallback always mentions whisper-cpp when no whisper backend is set
    if (doc.metadata.ffmpeg_available) {
      expect(doc.sections[0].content).toContain("whisper-cpp");
    } else {
      expect(doc.sections[0].content).toContain("brew install whisper-cpp");
      expect(doc.sections[0].content).toContain("brew install ffmpeg");
    }
  });

  test("video fallback mentions OpenRouter when API key not set", async () => {
    await setup();
    const videoPath = join(TMP, "no-key.mp4");
    await writeFile(videoPath, Buffer.alloc(100));

    const doc = await convertVideo(videoPath, null, null, false, null);

    expect(doc.sections[0].content).toContain("OPENROUTER_API_KEY");
    expect(doc.sections[0].content).toContain("Healer Alpha");
  });

  test("video conversion through pipeline", async () => {
    await setup();
    const videoPath = join(TMP, "pipeline-test.mp4");
    await writeFile(videoPath, Buffer.alloc(100));

    const { convertToMarkdown } = await import("../../src/core/convert");
    const { createRuntimeProviders } = await import("../../src/core/runtime");
    const { DEFAULT_CONFIG } = await import("../../src/config/defaults");

    const runtime = createRuntimeProviders(DEFAULT_CONFIG);
    const result = await convertToMarkdown(
      { input: videoPath, options: DEFAULT_CONFIG.options },
      runtime,
    );

    expect(result.kind).toBe("video");
    expect(result.metadata.support_level).toBe("optional");
    expect(result.markdown).toBeDefined();
    expect(result.markdown.length).toBeGreaterThan(0);
  });
});
