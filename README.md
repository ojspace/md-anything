# md-anything

Local-first Markdown conversion for files, webpages, and media.

Available as a **CLI**, an **MCP server** (for Claude, Cursor, and other AI tools), and an **HTTP API**.

[![CI](https://github.com/ojspace/md-anything/actions/workflows/ci.yml/badge.svg)](https://github.com/ojspace/md-anything/actions/workflows/ci.yml) ![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)

---

`md-anything` gives you a single, consistent interface for turning source material into usable Markdown.

It is built for:

- research and reading workflows
- AI agent pipelines
- documentation capture and offline use
- ingesting mixed-source folders into Markdown notes

### Highlights

- one command surface for files, webpages, and media
- strong support for text, markdown, JSON, HTML, URLs, and PDFs
- agent-ready interfaces: CLI, MCP, and machine-readable `--json`
- lightweight by default with optional OCR and media upgrades
- honest fallback behavior instead of silent failure

### Product principles

- **local-first** for the core workflow
- **lightweight by default** with optional upgrades
- **graceful under failure** with honest fallback output and metadata
- **automation-friendly** with a stable Markdown and JSON contract

---

## Quick start

```bash
# Install once, then use the short command
bun install -g md-anything
mda convert "https://hono.dev/docs/getting-started/basic"

# Or run without installing
bunx md-anything "https://hono.dev/docs/getting-started/basic"
```

If a result is weak, md-anything tells you why in the output metadata and extraction notes instead of failing silently.

---

## Why md-anything

Modern research and agent workflows keep running into the same problem:

**source material is everywhere, but usable Markdown is not.**

Every format tends to come with its own parser, its own edge cases, and its own failure modes. `md-anything` standardizes that behind one interface and one output shape so the rest of your workflow stays simple.

In practice, that means:

- fewer one-off scripts
- clearer automation paths
- better defaults for mixed-content workflows
- easier integration with agents and local tools

---

## What it does

| Input | Support | Notes |
|---|---|---|
| `.txt` | ✅ Strong | Plain text files |
| `.md` / `.markdown` | ✅ Strong | Passthrough |
| `.json` | ✅ Strong | Formatted code block |
| `.html` / `.htm` | ✅ Strong | Tag stripping + text extraction |
| URLs (`http://`, `https://`) | ✅ Strong | Fetch + HTML extraction |
| YouTube URLs | 🟡 Best-effort | Transcript-first; fallback note if unavailable |
| Images (`.png`, `.jpg`, `.webp`, `.gif`) | 🟡 Best-effort | Metadata + OCR if tesseract available |
| `.pdf` | ✅ Strong | unpdf zero-dep extraction; pdftotext fallback; OCR hint |
| `.epub` | 🟡 Best-effort | Native ZIP extraction; spine-aware |
| `.mobi` / `.azw` | 🟡 Best-effort | Requires Calibre `ebook-convert` |
| Audio (`.mp3`, `.wav`, etc.) | 🔶 Optional | Local `whisper-cpp` or opt-in OpenRouter fallback |
| Video (`.mp4`, `.mov`, etc.) | 🔶 Optional | Local `whisper-cpp` + `ffmpeg`, or opt-in OpenRouter fallback |

**Design principles:**
- Local-first — no cloud APIs needed for core functionality
- Graceful fallback over hard failure — every input produces valid output
- Honest output — metadata includes `support_level`, `usefulness_score`, and `extraction_status`

---

## What to expect

- **Works best today:** text, markdown, JSON, HTML, normal web pages, and most PDFs
- **Best-effort by design:** YouTube, images, EPUB, and MOBI
- **Optional local upgrades:** `tesseract`, `pdftotext`, `ebook-convert`, `whisper-cpp`, and `ffmpeg` improve some formats but are not required for the default workflow
- **Optional remote fallback:** `OPENROUTER_API_KEY` can improve image/audio/video extraction, but it is opt-in and not part of the core path
- **Weak outputs stay honest:** low-confidence results include extraction notes and metadata so you can decide whether to trust, retry, or install optional tools

## Lightweight by default

`md-anything` is intentionally useful without turning into a heavyweight AI setup project:

- the core install works with zero extra native tools
- no local models are bundled into the package
- richer OCR and transcription are optional upgrades
- remote AI fallbacks are opt-in via environment variables, not required

That means researchers, AI hobbyists, and agent users can start with the lightweight path and only add heavier capabilities when they actually need them.

---

## Requirements

- [Bun](https://bun.sh) v1.0+

---

## Install

```bash
# Global install (requires Bun)
bun install -g md-anything

# Primary short command after install
mda <input>

# Full command still works
md-anything <input>

# Or run without installing
bunx md-anything <input>
```

---

## CLI

```bash
# Convert a single file or URL
mda <input>
mda convert <input>

# See common copy-paste examples
mda examples

# Convert and save to a file
mda convert report.pdf -o report.md

# Ingest all supported files in a folder
mda ingest ./notes

# Ingest and write .md files to an output directory
mda ingest ./notes -o ./output

# Ingest recursively
mda ingest ./vault -r -o ./output

# Check available optional tools
mda doctor

# Help
mda --help
```

### Source manifests

Place a `sources.txt` or `sources.json` file inside an ingest folder to pull in URLs and remote resources alongside local files:

```
# sources.txt — one source per line, # for comments
https://www.youtube.com/watch?v=EqhKw0Oro_k
https://hono.dev/docs/getting-started/basic
https://example.com/some-article
```

```json
// sources.json
["https://url1.com", "https://url2.com"]
```

When `ingest` encounters a `sources.txt` or `sources.json`, it fetches and converts each source in the list along with local files.

---

### Guided errors

The CLI is designed to help, not just fail. Common mistakes get actionable messages:

- **Pass a directory** → suggests `mda ingest <path>` instead of crashing
- **Run `convert` with no input** → prints an example command with a real fixture
- **Unknown file type** → points you to `--help` or `examples`
- **Weak extraction** (image, PDF, EPUB, audio, video) → suggests `mda doctor` to see which optional tools can improve results

### Options

| Flag | Default | Description |
|---|---|---|
| `-o, --output <path>` | stdout | Output file (convert) or directory (ingest) |
| `--frontmatter` | `true` | Include YAML frontmatter with metadata |
| `--graph` | `false` | Extract entities and relations (ingest only) |
| `--index` | `false` | Generate `_index.md` table of contents (ingest only) |
| `-r, --recursive` | `false` | Process subdirectories (ingest only) |
| `-h, --help` | — | Show help |

### Output format

Every converted file includes YAML frontmatter:

```yaml
---
title: "My Document"
source: "path/to/file.pdf"
source_type: pdf
extraction: unpdf
extraction_status: ok
support_level: strong
usefulness_score: 0.85
---
```

---

## Agent-Native Usage

md-anything is designed to be used directly by AI agents — not just humans.

### Compatibility matrix

| Surface | Status | How it works |
|---|---|---|
| CLI | Ready | `mda` and `md-anything` both work for direct shell use |
| MCP | Ready | `md-anything-mcp` exposes `convert`, `ingest`, and `doctor` |
| Claude Code plugin | Ready | `.claude-plugin/` provides slash-command wrappers |
| Package-scan skill discovery | Ready | `SKILL.md` ships in the npm package |
| ClawHub / OpenClaw-style ecosystems | Ready | Stable CLI + `--json` + packaged `SKILL.md` make md-anything discoverable and callable without a custom adapter |

### Claude Code Plugin

Install the plugin for slash command access inside any Claude Code session:

```bash
/plugin marketplace add ojspace/md-anything
/plugin install md-anything
```

Then use slash commands directly:

```
/md-anything:convert report.pdf
/md-anything:ingest ./notes
/md-anything:doctor
```

### JSON output for agent pipelines

Use `--json` to get structured output any agent can parse:

```bash
mda convert report.pdf --json
```

```json
{
  "input": "report.pdf",
  "markdown": "# Report Title\n...",
  "kind": "pdf",
  "supportLevel": "strong",
  "metadata": {
    "extraction": "unpdf",
    "extraction_status": "ok",
    "support_level": "strong",
    "usefulness_score": 0.85
  },
  "warnings": []
}
```

```bash
mda ingest ./notes --json
```

```json
{
  "converted": 12,
  "skipped": 2,
  "failed": 0,
  "docs": [{ "fileName": "note.md", "title": "My Note", "sourceType": "pdf", "source": "report.pdf", "metadata": { "extraction_status": "ok" } }]
}
```

Argument errors are also machine-readable:

```bash
mda convert --json
```

```json
{
  "error": "Missing input for convert command.",
  "code": "missing_input",
  "examples": [
    "mda convert tests/fixtures/sample.txt",
    "mda convert \"https://example.com/article\""
  ]
}
```

### SKILL.md — agent discoverability

After `npm install -g md-anything`, a `SKILL.md` is available in the package with YAML frontmatter and full command documentation. AI agents that scan installed packages for skill definitions will discover md-anything automatically.

### ClawHub / OpenClaw compatibility

md-anything is intentionally compatible with skill-driven ecosystems that rely on:

- package-shipped skill docs (`SKILL.md`)
- a stable CLI entrypoint
- machine-readable JSON output
- local, dependency-light execution

That means it is already well-positioned for ClawHub/OpenClaw-style discovery and invocation without needing a separate product fork.

### Capability layers

There are three intended usage modes:

- **Lightweight mode:** install nothing extra and use the strong core formats
- **Local privacy mode:** add local tools like `tesseract`, `pdftotext`, `whisper-cpp`, and `ffmpeg`
- **Remote convenience mode:** set `OPENROUTER_API_KEY` for optional image/audio/video fallbacks

The default product philosophy is still local-first. Remote fallbacks should never become a hidden requirement for the main tool.

---

## MCP Server

Use md-anything as an MCP tool inside Claude, Cursor, or any MCP-compatible host.

### Add to `.mcp.json`

```json
{
  "mcpServers": {
    "md-anything": {
      "command": "bunx",
      "args": ["md-anything-mcp"]
    }
  }
}
```

Or if installed globally:

```json
{
  "mcpServers": {
    "md-anything": {
      "command": "md-anything-mcp"
    }
  }
}
```

### Available MCP tools

| Tool | Description |
|---|---|
| `convert` | Convert a file path or URL to Markdown |
| `ingest` | Batch-convert all files in a folder |
| `doctor` | Report available capabilities |

**Example usage in Claude:**
> "Convert this PDF to Markdown" → Claude calls `convert` with the file path
> "Ingest my notes folder" → Claude calls `ingest` with the folder path

---

## HTTP API

Start the REST API server:

```bash
md-anything-server          # default port 3000
PORT=8080 md-anything-server
```

Or via npm scripts:

```bash
bun run server
```

### Endpoints

#### `GET /doctor`
Returns available capabilities.

```bash
curl http://localhost:3000/doctor
```

```json
{
  "core": {
    "text/markdown/json/html": "strong",
    "url": "strong",
    "youtube": "best-effort",
    "image": "best-effort",
    "pdf": "strong",
    "epub": "best-effort",
    "mobi": "best-effort"
  },
  "optional_tools": {
    "tesseract": true,
    "pdftotext": true,
    "ebook_convert": false,
    "whisper": false
  }
}
```

#### `POST /convert`
Convert a file or URL to Markdown.

```bash
curl -X POST http://localhost:3000/convert \
  -H "Content-Type: application/json" \
  -d '{"input": "/path/to/file.pdf"}'
```

```bash
curl -X POST http://localhost:3000/convert \
  -H "Content-Type: application/json" \
  -d '{"input": "https://www.youtube.com/watch?v=EqhKw0Oro_k"}'
```

**Request body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `input` | string | ✅ | Absolute file path or URL |
| `frontmatter` | boolean | — | Include YAML frontmatter (default: `true`) |

**Response:**

```json
{
  "input": "/path/to/file.pdf",
  "kind": "pdf",
  "markdown": "---\ntitle: ...\n---\n\n# ...",
  "metadata": {
    "extraction": "unpdf",
    "extraction_status": "ok",
    "support_level": "strong",
    "usefulness_score": 0.85
  }
}
```

#### `POST /ingest`
Batch-convert all supported files in a folder.

```bash
curl -X POST http://localhost:3000/ingest \
  -H "Content-Type: application/json" \
  -d '{"folder": "/path/to/notes", "recursive": true}'
```

**Request body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `folder` | string | ✅ | Absolute path to the folder |
| `recursive` | boolean | — | Process subdirectories (default: `false`) |

---

## Optional tools

Install these to unlock additional capabilities:

```bash
# OCR for images
brew install tesseract

# PDF text extraction
brew install poppler

# MOBI/ebook conversion
brew install --cask calibre

# Audio/video transcription (preferred — no Python required)
brew install whisper-cpp
whisper-cpp --download-model base.en

# Or use the Python fallback
pip install openai-whisper
```

Verify what's available:

```bash
mda doctor
```

---

## Development

```bash
git clone https://github.com/ojspace/md-anything
cd md-anything
bun install
bun test
bun run doctor
```

### Test suite

```bash
bun test                # full suite
bun run test:required   # subset that passes without optional tools
bun run test:fixtures   # regenerate binary test fixtures (PDF, EPUB)
```

### Project structure

```
src/
  cli.ts          # CLI entry point
  mcp.ts          # MCP server (stdio)
  server.ts       # HTTP API (Hono)
  core/           # convert, ingest, detect, finalize, usefulness
  providers/      # one file per input type
  formatters/     # markdown formatter
  config/         # defaults
  schemas/        # Zod schemas
tests/
  unit/           # pure logic tests
  integration/    # end-to-end conversion tests
  fixtures/       # test input files
```

### Adding a new content type

New formats should plug into the existing flow instead of inventing a parallel path:

1. add detection in `src/core/detect-input.ts`
2. add a provider in `src/providers/`
3. wire it into `src/core/route-input.ts`
4. set a support level in `src/core/support-levels.ts`
5. return a `NormalizedDocument` with honest fallback metadata
6. add contributor-safe tests first, then optional/live coverage if needed

This keeps Phase 2 work like Vimeo support and richer structured extraction additive instead of architectural.

### Media-family roadmap

For media sources like Vimeo, the intended direction is:

1. detect the media URL subtype
2. reuse shared media extraction/transcript logic where possible
3. return the same `NormalizedDocument` shape with honest metadata
4. degrade to a useful fallback stub when transcripts or audio are unavailable

That keeps new providers additive instead of platform-specific rewrites.

### Structured extraction groundwork

Internally, sections can carry lightweight semantic hints such as transcript, OCR, or fallback content. The public contract stays Markdown-first, while future structured extraction can build on those hints without breaking current users.

---

## Personal usage guide

This is how I use md-anything day-to-day. Concrete workflows, not hypotheticals.

### Feed a book or research PDF into Claude

```bash
# Extract a PDF and pipe straight into a prompt
mda convert ~/Downloads/hacking-growth.pdf -o /tmp/book.md
# Then open book.md in Claude with: "Summarize the key growth frameworks"
```

### Ingest my Obsidian vault's reading inbox

```bash
# Turn all PDFs/EPUBs/URLs in a reading folder into linked Markdown notes
mda ingest ~/Documents/reading-inbox -r --index --graph -o ~/Obsidian/inbox/converted/
```

The `--index` flag generates `_index.md` — a Markdown table linking all converted notes.
The `--graph` flag adds entity extraction (people, places, concepts) to each note's metadata.

### Convert a YouTube talk to notes

```bash
mda convert "https://www.youtube.com/watch?v=EqhKw0Oro_k"
# If captions are available: full transcript → structured Markdown
# If not: honest fallback stub so you know why it's empty
```

### Pull a docs page for offline use or RAG

```bash
mda convert "https://hono.dev/docs/getting-started/basic" -o /tmp/hono-basics.md
```

### Transcribe a voice note or meeting recording

```bash
# Optional local upgrade: brew install whisper-cpp ffmpeg (then: whisper-cpp --download-model base.en)
mda convert ~/recordings/standup-2026-03-13.mp3 -o standup.md
mda convert ~/recordings/investor-call.mp4 -o investor-call.md
```

### Bulk-process a folder and check what happened

```bash
mda ingest ./notes --index -o ./output/
# _index.md shows every file: title, type, source — scan it to see what converted cleanly
```

### MCP inside Claude — no CLI needed

Once `.mcp.json` is in your project root, Claude can convert files directly:

> "Convert the PDF at ~/Downloads/report.pdf to Markdown so I can analyze it"

Claude calls `convert`, gets the Markdown, and uses it in context — without you leaving the chat.

### Set up optional tools only if you need them

```bash
brew install poppler tesseract ffmpeg whisper-cpp
whisper-cpp --download-model base.en
mda doctor  # verify everything is detected
```

After this, PDFs extract more text, images get local OCR, and audio/video can be transcribed locally. The base install still works without these tools.

---

## Contributing

1. Fork and branch from `main`
2. `bun install && bun run test:required` must be green before opening a PR
3. New input types go in `src/providers/` with a matching test in `tests/integration/`
4. Follow the support level model: `strong` / `best-effort` / `optional`

---

## License

MIT
