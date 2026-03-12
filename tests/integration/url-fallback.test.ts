import { expect, test, describe } from "bun:test";
import { convertToMarkdown } from "../../src/core/convert";
import { createRuntimeProviders } from "../../src/core/runtime";
import { DEFAULT_CONFIG } from "../../src/config/defaults";

const runtime = createRuntimeProviders(DEFAULT_CONFIG);

describe("URL fallback structure (deterministic shape tests)", () => {
  test("detectInputKind identifies cnn URL as url kind", async () => {
    const { detectInputKind } = await import("../../src/core/detect-input");
    const url = "https://edition.cnn.com/travel/japan-seto-inland-sea-shimanami-kaido";
    expect(detectInputKind(url)).toBe("url");
  });

  test("URL conversion result has expected shape", async () => {
    const { convertUrl } = await import("../../src/providers/url");
    
    const doc = await convertUrl("http://localhost:59999/nonexistent");
    
    expect(doc.sourceType).toBe("url");
    expect(doc.source).toBe("http://localhost:59999/nonexistent");
    expect(doc.sections.length).toBeGreaterThan(0);
    expect(doc.metadata.extraction).toBe("url-fetch");
    expect(doc.metadata.extraction_status).toBeDefined();
    expect(["ok", "error", "weak"]).toContain(doc.metadata.extraction_status as string);
  });

  test("URL conversion result carries fetch status metadata", async () => {
    const { convertUrl } = await import("../../src/providers/url");
    const doc = await convertUrl("http://localhost:59999/nonexistent");
    
    expect(doc.metadata.url).toBe("http://localhost:59999/nonexistent");
    expect(doc.metadata.fetch_status).toBeDefined();
  });

  test("full pipeline with URL produces valid ConvertResult shape", async () => {
    const { convertUrl } = await import("../../src/providers/url");
    const doc = await convertUrl("http://localhost:59999/nonexistent");
    
    expect(doc.title).toBeDefined();
    expect(doc.source).toBeDefined();
    expect(doc.sourceType).toBe("url");
    expect(doc.sections).toBeInstanceOf(Array);
    expect(doc.metadata).toBeInstanceOf(Object);
  });
});
