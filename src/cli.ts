#!/usr/bin/env bun

import { parseArgs } from "node:util";
import { resolve } from "node:path";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { convertToMarkdown } from "./core/convert";
import { ingestFolder } from "./core/ingest";
import { runDoctor } from "./core/doctor";
import { DEFAULT_CONFIG } from "./config/defaults";
import { createRuntimeProviders } from "./core/runtime";
import { formatMarkdown } from "./formatters/markdown";

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    output: { type: "string", short: "o" },
    frontmatter: { type: "boolean", default: true },
    graph: { type: "boolean", default: false },
    index: { type: "boolean", default: false },
    recursive: { type: "boolean", short: "r", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
  allowPositionals: true,
});

const command = positionals[0];
const isConvertCommand = command === "convert";

if (values.help || !command) {
  console.log(`
md-anything - Convert anything to Markdown

Usage:
  md-anything <input>             Convert a single file/URL to Markdown
  md-anything convert <input>     Convert a single file/URL to Markdown
  md-anything ingest <folder>     Ingest all files in a folder
  md-anything doctor              Check available capabilities
  md-anything-mcp                 Start the MCP server (stdio)
  md-anything-server              Start the HTTP API server

Options:
  -o, --output <path>   Output file (convert) or directory (ingest)
  --frontmatter         Include YAML frontmatter (default: true)
  --graph               Extract entities and relations (ingest only)
  --index               Generate _index.md listing (ingest only)
  -r, --recursive       Process subdirectories
  -h, --help            Show help
`);
  process.exit(0);
}

const runtime = createRuntimeProviders(DEFAULT_CONFIG);

if (command === "doctor") {
  runDoctor();
  process.exit(0);
}

if (command === "ingest") {
  const folder = positionals[1] || ".";
  const outputDir = values.output;

  const result = await ingestFolder(resolve(folder), runtime, {
    recursive: values.recursive,
    graph: values.graph,
    index: values.index,
  });

  if (outputDir) {
    await mkdir(outputDir, { recursive: true });
    for (const doc of result.docs) {
      const md = formatMarkdown(
        { ...doc, metadata: doc.metadata },
        { frontmatter: values.frontmatter },
      );
      const outPath = join(outputDir, doc.fileName);
      await writeFile(outPath, md, "utf-8");
    }
    console.log(
      `Ingested: ${result.converted} files, ${result.skipped} skipped, ${result.failed} failed → written to ${outputDir}/`,
    );
  } else {
    console.log(
      `Ingested: ${result.converted} files, ${result.skipped} skipped, ${result.failed} failed`,
    );
  }

  process.exit(0);
}

const input = isConvertCommand ? positionals[1] : command;
if (isConvertCommand && !input) {
  console.error("Missing input for convert command.\nUsage: md-anything convert <input>");
  process.exit(1);
}

// Single file/URL conversion
const result = await convertToMarkdown(
  { input, options: { ...DEFAULT_CONFIG.options, frontmatter: values.frontmatter } },
  runtime,
);

const out = values.output || "/dev/stdout";
if (out === "/dev/stdout") {
  console.log(result.markdown);
} else {
  await writeFile(out, result.markdown, "utf-8");
  console.log(`Written to ${out}`);
}
