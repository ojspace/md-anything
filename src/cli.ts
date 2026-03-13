#!/usr/bin/env bun

import { parseArgs } from "node:util";
import { resolve } from "node:path";
import { writeFile } from "node:fs/promises";
import { convertToMarkdown } from "./core/convert";
import { ingestFolder } from "./core/ingest";
import { runDoctor } from "./core/doctor";
import { DEFAULT_CONFIG } from "./config/defaults";
import { createRuntimeProviders } from "./core/runtime";

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

if (values.help || !command) {
  console.log(`
md-anything - Convert anything to Markdown

Usage:
  md-anything <input>           Convert a single file/URL to Markdown
  md-anything ingest <folder>   Ingest all files in a folder
  md-anything doctor            Check available capabilities

Options:
  -o, --output <path>   Output file or directory
  --frontmatter         Include YAML frontmatter (default: true)
  --graph               Enable graph enrichment
  --index               Generate index file
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
  const result = await ingestFolder(resolve(folder), runtime, {
    graph: values.graph,
    index: values.index,
    recursive: values.recursive,
  });
  console.log(`Ingested: ${result.converted} files, ${result.skipped} skipped, ${result.failed} failed`);
  process.exit(0);
}

// Single file/URL conversion
const result = await convertToMarkdown(
  { input: command, options: DEFAULT_CONFIG.options },
  runtime,
);

const out = values.output || "/dev/stdout";
if (out === "/dev/stdout") {
  console.log(result.markdown);
} else {
  await writeFile(out, result.markdown, "utf-8");
  console.log(`Written to ${out}`);
}
