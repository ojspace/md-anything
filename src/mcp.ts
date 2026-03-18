#!/usr/bin/env bun
/**
 * md-anything MCP Server
 * Exposes convert, ingest, and doctor as MCP tools for use in Claude, Cursor, etc.
 *
 * Usage in .mcp.json:
 *   { "mcpServers": { "md-anything": { "command": "bunx", "args": ["md-anything-mcp"] } } }
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { resolve } from "node:path";
import { convertToMarkdown } from "./core/convert";
import { ingestFolder } from "./core/ingest";
import { detectCapabilities } from "./core/runtime";
import { DEFAULT_CONFIG } from "./config/defaults";
import { createRuntimeProviders } from "./core/runtime";

const runtime = createRuntimeProviders(DEFAULT_CONFIG);

const server = new Server(
  { name: "md-anything", version: "0.1.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "convert",
      description:
        "Convert a file or URL to Markdown. Supports: text, markdown, JSON, HTML, URLs, YouTube videos (transcript), images (OCR), PDFs, EPUBs, and MOBIs.",
      inputSchema: {
        type: "object" as const,
        properties: {
          input: {
            type: "string",
            description: "Absolute file path or URL (http/https) to convert",
          },
          frontmatter: {
            type: "boolean",
            description: "Include YAML frontmatter with metadata (default: true)",
          },
        },
        required: ["input"],
      },
    },
    {
      name: "ingest",
      description:
        "Batch-convert all supported files in a folder. Returns a list of converted documents with their Markdown content.",
      inputSchema: {
        type: "object" as const,
        properties: {
          folder: {
            type: "string",
            description: "Absolute path to the folder to ingest",
          },
          recursive: {
            type: "boolean",
            description: "Process subdirectories recursively (default: false)",
          },
        },
        required: ["folder"],
      },
    },
    {
      name: "doctor",
      description:
        "Report lightweight core support plus optional local and remote capability upgrades such as tesseract, pdftotext, whisper-cpp, ffmpeg, and OPENROUTER_API_KEY.",
      inputSchema: {
        type: "object" as const,
        properties: {},
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "convert") {
    const { input, frontmatter = true } = args as {
      input: string;
      frontmatter?: boolean;
    };

    const resolvedInput = /^https?:\/\//i.test(input) ? input : resolve(input);
    const result = await convertToMarkdown(
      { input: resolvedInput, options: { ...DEFAULT_CONFIG.options, frontmatter } },
      runtime,
    );

    return {
      content: [
        {
          type: "text" as const,
          text: result.markdown,
        },
      ],
    };
  }

  if (name === "ingest") {
    const { folder, recursive = false } = args as {
      folder: string;
      recursive?: boolean;
    };

    const result = await ingestFolder(resolve(folder), runtime, { recursive });

    const summary = [
      `Ingested ${result.converted} files, ${result.skipped} skipped, ${result.failed} failed.`,
      "",
      ...result.docs.map(
        (doc) =>
          `### ${doc.title}\n**Source:** ${doc.source}\n**Type:** ${doc.sourceType}\n`,
      ),
    ].join("\n");

    return {
      content: [{ type: "text" as const, text: summary }],
    };
  }

  if (name === "doctor") {
    const caps = detectCapabilities();
    const lines = [
      "## md-anything capabilities",
      "",
      "### Core (always available)",
      "- ✅ text, markdown, json, html — strong",
      "- ✅ url — strong (fetch-based)",
      "- ✅ youtube — best-effort (transcript-first)",
      "- ✅ image — best-effort (metadata + optional OCR)",
      "- ✅ pdf — strong (unpdf zero-dep + pdftotext fallback)",
      "- ✅ epub — best-effort (native zip extraction)",
      "- ✅ mobi — best-effort (requires ebook-convert)",
      "",
      "### Optional tools",
      `${caps.hasTesseract ? "✅" : "❌"} tesseract — OCR for images`,
      `${caps.hasPdftotext ? "✅" : "❌"} pdftotext — PDF text extraction`,
      `${caps.hasEbookConvert ? "✅" : "❌"} ebook-convert — MOBI/ebook conversion`,
      `${caps.hasWhisper ? "✅" : "❌"} whisper — audio/video transcription`,
    ];

    return {
      content: [{ type: "text" as const, text: lines.join("\n") }],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
