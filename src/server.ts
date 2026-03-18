#!/usr/bin/env bun
/**
 * md-anything HTTP API Server
 * Runs a local REST API exposing convert, ingest, and doctor.
 *
 * Usage:
 *   bun run src/server.ts          # default port 3000
 *   PORT=8080 bun run src/server.ts
 *
 * Or globally: md-anything-server
 */

import { Hono } from "hono";
import { resolve } from "node:path";
import { convertToMarkdown } from "./core/convert";
import { ingestFolder } from "./core/ingest";
import { detectCapabilities } from "./core/runtime";
import { DEFAULT_CONFIG } from "./config/defaults";
import { createRuntimeProviders } from "./core/runtime";

const app = new Hono();
const runtime = createRuntimeProviders(DEFAULT_CONFIG);

app.get("/", (c) =>
  c.json({
    name: "md-anything",
    version: "0.1.0",
    endpoints: {
      "GET  /health": "Health check",
      "GET  /doctor": "Capability report",
      "POST /convert": "Convert a file or URL to Markdown",
      "POST /ingest": "Batch-convert all files in a folder",
    },
  }),
);

app.get("/health", (c) => c.json({ status: "ok" }));

app.get("/doctor", (c) => {
  const caps = detectCapabilities();
  return c.json({
    core: {
      "text/markdown/json/html": "strong",
      url: "strong",
      youtube: "best-effort",
      image: "best-effort",
      pdf: "strong",
      epub: "best-effort",
      mobi: "best-effort",
    },
    optional_tools: {
      tesseract: caps.hasTesseract,
      pdftotext: caps.hasPdftotext,
      ebook_convert: caps.hasEbookConvert,
      whisper: caps.hasWhisper,
    },
  });
});

app.post("/convert", async (c) => {
  let body: { input?: string; frontmatter?: boolean };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const { input, frontmatter = true } = body;

  if (!input) {
    return c.json({ error: "Missing required field: input" }, 400);
  }

  try {
    const result = await convertToMarkdown(
      {
        input: resolve(input),
        options: { ...DEFAULT_CONFIG.options, frontmatter },
      },
      runtime,
    );

    return c.json({
      input: result.input,
      kind: result.kind,
      markdown: result.markdown,
      metadata: result.metadata,
    });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

app.post("/ingest", async (c) => {
  let body: { folder?: string; recursive?: boolean };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const { folder, recursive = false } = body;

  if (!folder) {
    return c.json({ error: "Missing required field: folder" }, 400);
  }

  try {
    const result = await ingestFolder(resolve(folder), runtime, { recursive });

    return c.json({
      converted: result.converted,
      skipped: result.skipped,
      failed: result.failed,
      docs: result.docs.map((doc) => ({
        fileName: doc.fileName,
        title: doc.title,
        source: doc.source,
        sourceType: doc.sourceType,
        metadata: doc.metadata,
      })),
    });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

const port = parseInt(process.env.PORT ?? "3000", 10);

export default {
  port,
  fetch: app.fetch,
};

console.log(`md-anything API running on http://localhost:${port}`);
