import { expect, test, describe } from "bun:test";
import { convertYoutube, type YouTubeTranscriptBackend, type TranscriptResult } from "../../src/providers/youtube";
import { convertToMarkdown } from "../../src/core/convert";
import { createRuntimeProviders } from "../../src/core/runtime";
import { DEFAULT_CONFIG } from "../../src/config/defaults";

const runtime = createRuntimeProviders(DEFAULT_CONFIG);

function makeMockBackend(result: TranscriptResult): YouTubeTranscriptBackend {
  return {
    async fetch(_videoId: string): Promise<TranscriptResult> {
      return result;
    },
  };
}

describe("youtube conversion (transcript-first, fallback validated)", () => {
  test("extracts video ID from standard YouTube URL", async () => {
    const backend = makeMockBackend({ text: "Hello world test transcript", status: "captions", language: "en" });
    const doc = await convertYoutube("https://www.youtube.com/watch?v=EqhKw0Oro_k", backend);
    
    expect(doc.metadata.video_id).toBe("EqhKw0Oro_k");
    expect(doc.metadata.transcript_status).toBe("captions");
    expect(doc.sourceType).toBe("youtube");
  });

  test("extracts video ID from youtu.be short URL", async () => {
    const backend = makeMockBackend({ text: "Short URL transcript", status: "captions" });
    const doc = await convertYoutube("https://youtu.be/EqhKw0Oro_k", backend);
    expect(doc.metadata.video_id).toBe("EqhKw0Oro_k");
  });

  test("handles unavailable transcript gracefully", async () => {
    const backend = makeMockBackend({ text: "", status: "unavailable" });
    const doc = await convertYoutube("https://www.youtube.com/watch?v=EqhKw0Oro_k", backend);
    
    expect(doc.metadata.transcript_status).toBe("unavailable");
    expect(doc.metadata.extraction_status).toBe("unavailable");
    expect(doc.sections.length).toBeGreaterThan(0);
    expect(doc.sections[0].content).toBeTruthy();
  });

  test("handles error status gracefully", async () => {
    const backend = makeMockBackend({ text: "", status: "error" });
    const doc = await convertYoutube("https://www.youtube.com/watch?v=EqhKw0Oro_k", backend);
    
    expect(doc.metadata.transcript_status).toBe("error");
    expect(doc.sections.length).toBeGreaterThan(0);
  });

  test("returns transcript text in sections when available", async () => {
    const backend = makeMockBackend({ text: "This is the full transcript text content.", status: "captions", language: "en" });
    const doc = await convertYoutube("https://www.youtube.com/watch?v=EqhKw0Oro_k", backend);
    
    expect(doc.sections.some((s) => s.content.includes("This is the full transcript text content."))).toBe(true);
    expect(doc.metadata.transcript_language).toBe("en");
  });

  test("full convertToMarkdown pipeline with youtube url", async () => {
    const url = "https://www.youtube.com/watch?v=EqhKw0Oro_k";
    const { detectInputKind } = await import("../../src/core/detect-input");
    expect(detectInputKind(url)).toBe("youtube");
  });

  test("invalid youtube URL returns error doc", async () => {
    const doc = await convertYoutube("https://www.youtube.com/watch?v=INVALID_FORMAT_TOO_LONG_FOR_ID");
    expect(doc.metadata.extraction_status).toBe("error");
    expect(doc.metadata.error).toBe("invalid-url");
  });
});
