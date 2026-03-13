import { expect, test, describe } from "bun:test";
import { detectInputKind } from "../../src/core/detect-input";

describe("detectInputKind", () => {
  test("detects youtube URLs", () => {
    expect(detectInputKind("https://www.youtube.com/watch?v=EqhKw0Oro_k")).toBe("youtube");
    expect(detectInputKind("https://youtu.be/abc123xyz")).toBe("youtube");
    expect(detectInputKind("https://www.youtube.com/shorts/abc123xyz")).toBe("youtube");
  });

  test("detects regular URLs", () => {
    expect(detectInputKind("https://edition.cnn.com/travel/some-article")).toBe("url");
    expect(detectInputKind("http://example.com")).toBe("url");
  });

  test("detects file types by extension", () => {
    expect(detectInputKind("file.txt")).toBe("text");
    expect(detectInputKind("file.md")).toBe("markdown");
    expect(detectInputKind("file.markdown")).toBe("markdown");
    expect(detectInputKind("file.json")).toBe("json");
    expect(detectInputKind("file.html")).toBe("html");
    expect(detectInputKind("file.htm")).toBe("html");
    expect(detectInputKind("file.pdf")).toBe("pdf");
    expect(detectInputKind("file.epub")).toBe("epub");
    expect(detectInputKind("file.mobi")).toBe("mobi");
    expect(detectInputKind("file.azw")).toBe("mobi");
    expect(detectInputKind("file.azw3")).toBe("mobi");
  });

  test("detects image types", () => {
    expect(detectInputKind("photo.png")).toBe("image");
    expect(detectInputKind("photo.jpg")).toBe("image");
    expect(detectInputKind("photo.jpeg")).toBe("image");
    expect(detectInputKind("photo.webp")).toBe("image");
    expect(detectInputKind("photo.gif")).toBe("image");
  });

  test("detects audio/video types", () => {
    expect(detectInputKind("file.mp3")).toBe("audio");
    expect(detectInputKind("file.mp4")).toBe("video");
    expect(detectInputKind("file.wav")).toBe("audio");
  });

  test("returns unknown for unrecognized inputs", () => {
    expect(detectInputKind("file.xyz")).toBe("unknown");
    expect(detectInputKind("random-string")).toBe("unknown");
  });
});
