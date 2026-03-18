#!/usr/bin/env bun

import { parseArgs } from "node:util";
import { resolve } from "node:path";
import { writeFile, mkdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { convertToMarkdown } from "./core/convert";
import { ingestFolder } from "./core/ingest";
import { runDoctor } from "./core/doctor";
import { DEFAULT_CONFIG } from "./config/defaults";
import { createRuntimeProviders } from "./core/runtime";
import { formatMarkdown } from "./formatters/markdown";
import { INPUT_SUPPORT_LEVELS } from "./core/support-levels";
import type { InputKind } from "./core/types";

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    output: { type: "string", short: "o" },
    frontmatter: { type: "boolean", default: true },
    json: { type: "boolean", default: false },
    recursive: { type: "boolean", short: "r", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
  allowPositionals: true,
});

const command = positionals[0];
const isConvertCommand = command === "convert";

interface JsonError {
  error: string;
  code: string;
  suggestion?: string;
  examples?: string[];
}

function printJson(value: unknown): void {
  console.log(JSON.stringify(value));
}

function printJsonError(error: JsonError): never {
  printJson(error);
  process.exit(1);
}

function buildConvertWarnings(input: string, kind: InputKind, metadata: Record<string, unknown>): string[] {
  const warnings: string[] = [];

  if (kind === "unknown") {
    warnings.push(`Could not detect a supported input type for "${input}".`);
    warnings.push("Try `mda --help` or `mda examples` for supported usage.");
  }

  if (shouldSuggestDoctor(kind, metadata)) {
    warnings.push("Run `mda doctor` to see which optional local tools can improve this result.");
  }

  return warnings;
}

function isUrlInput(input: string): boolean {
  return /^https?:\/\//i.test(input);
}

function printExamples(): void {
  console.log(`
mda examples

Copy-paste examples:
  mda tests/fixtures/sample.txt
  mda convert tests/fixtures/sample.png
  mda convert "https://www.youtube.com/watch?v=EqhKw0Oro_k"
  mda ingest ./notes -o ./output -r
  mda doctor

Quick tips:
  - Use \`convert <input>\` or just \`<input>\` for one file or URL.
  - Use \`ingest <folder>\` for directories.
  - Run \`doctor\` to see which optional local tools are available.
`);
}

function printHelp(): void {
  console.log(`
mda (full command: md-anything) - Convert anything to Markdown

Common commands:
  mda report.pdf
  mda convert "https://example.com/article"
  mda ingest ./notes -o ./output -r
  mda doctor
  mda examples

Usage:
  mda <input>
  mda convert <input>
  mda ingest <folder>
  mda doctor
  mda examples
  md-anything-mcp

Options:
  -o, --output <path>   Output file (convert) or directory (ingest)
  --frontmatter         Include YAML frontmatter (default: true)
  --json                Output JSON instead of Markdown (for agent pipelines)
  -r, --recursive       Process subdirectories
  -h, --help            Show help

Need more ideas? Run: mda examples
`);
}

function printMissingConvertInput(): void {
  if (values.json) {
    printJsonError({
      error: "Missing input for convert command.",
      code: "missing_input",
      examples: [
        "mda convert tests/fixtures/sample.txt",
        'mda convert "https://example.com/article"',
      ],
    });
  }

  console.error(`Missing input for convert command.

Try this:
  mda convert tests/fixtures/sample.txt
  mda convert "https://example.com/article"

Need more ideas? Run: mda examples`);
}

function printDirectoryGuidance(input: string): void {
  if (values.json) {
    printJsonError({
      error: `"${input}" is a directory.`,
      code: "directory_input",
      suggestion: `Use \`mda ingest ${input}\` for folders.`,
      examples: [
        `mda ingest ${input}`,
        `mda ingest ${input} -o ./output -r`,
      ],
    });
  }

  console.error(`"${input}" is a directory.

Use ingest for folders.

Try this:
  mda ingest ${input}
  mda ingest ${input} -o ./output -r

Need more ideas? Run: mda examples`);
}

function printUnknownInputGuidance(input: string): void {
  if (values.json) {
    return;
  }

  console.error(`Could not detect a supported input type for "${input}".

Try this:
  mda path/to/file.txt
  mda convert "https://example.com/article"
  mda ingest ./notes

Need more ideas? Run: mda --help or mda examples`);
}

function shouldSuggestDoctor(kind: InputKind, metadata: Record<string, unknown>): boolean {
  if (metadata.extraction_status === "ok") {
    return false;
  }

  return (
    kind === "image" ||
    kind === "pdf" ||
    kind === "epub" ||
    kind === "mobi" ||
    kind === "audio" ||
    kind === "video"
  );
}

if (values.help || !command || command === "help") {
  printHelp();
  process.exit(0);
}

const runtime = createRuntimeProviders(DEFAULT_CONFIG);

if (command === "doctor") {
  runDoctor();
  process.exit(0);
}

if (command === "examples" || command === "demo") {
  printExamples();
  process.exit(0);
}

if (command === "ingest") {
  const folder = positionals[1] || ".";
  const outputDir = values.output;

  const result = await ingestFolder(resolve(folder), runtime, {
    recursive: values.recursive,
  });

  if (values.json) {
    printJson({
      converted: result.converted,
      skipped: result.skipped,
      failed: result.failed,
      docs: result.docs.map((d) => ({
        fileName: d.fileName,
        title: d.title,
        sourceType: d.sourceType,
        source: d.source,
        metadata: d.metadata,
      })),
    });
  } else if (outputDir) {
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
  printMissingConvertInput();
  process.exit(1);
}

if (!isUrlInput(input)) {
  try {
    const inputStats = await stat(input);
    if (inputStats.isDirectory()) {
      printDirectoryGuidance(input);
      process.exit(1);
    }
  } catch {
    // Leave missing or invalid file handling to the conversion pipeline.
  }
}

// Single file/URL conversion
const result = await convertToMarkdown(
  { input, options: { ...DEFAULT_CONFIG.options, frontmatter: values.frontmatter } },
  runtime,
);

if (result.kind === "unknown") {
  printUnknownInputGuidance(input);
}

if (!values.json && shouldSuggestDoctor(result.kind, result.metadata)) {
  console.error("Tip: run `mda doctor` to see which optional local tools are available.");
}

if (values.json) {
  printJson({
    input: result.input,
    markdown: result.markdown,
    kind: result.kind,
    supportLevel: INPUT_SUPPORT_LEVELS[result.kind],
    metadata: result.metadata,
    warnings: buildConvertWarnings(input, result.kind, result.metadata),
  });
} else {
  const out = values.output || "/dev/stdout";
  if (out === "/dev/stdout") {
    console.log(result.markdown);
  } else {
    await writeFile(out, result.markdown, "utf-8");
    console.log(`Written to ${out}`);
  }
}
