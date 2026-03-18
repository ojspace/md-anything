# md-anything

Convert anything to Markdown — files, URLs, YouTube videos, PDFs, EPUBs, images, and more.

Available as a **CLI**, an **MCP server** (for Claude, Cursor, and other AI tools), and an **HTTP API**.

[![CI](https://github.com/ojspace/md-anything/actions/workflows/ci.yml/badge.svg)](https://github.com/ojspace/md-anything/actions/workflows/ci.yml)

---

## Why I built this

I build products across two companies. My days are dense — PDFs from investors, YouTube talks I want to extract ideas from, docs pages I need to search later, audio notes from walks, books in EPUB and MOBI I'm reading through. All of it locked in formats that AI tools and note apps can't easily consume.

I wanted one command that could take *anything* and give me clean, structured Markdown I could drop into Obsidian, feed to Claude, or grep through. Something local-first that doesn't phone home, works offline for files, and never hard-fails — even if it can only produce a stub, it tells me *why*.

So I built it. I use it daily. And I open-sourced it because I suspect a lot of developers have the same problem.

**The philosophy in three lines:**
- Local-first — no cloud APIs for core functionality, your files stay on your machine
- Graceful over correct — a useful stub beats a crash, every time
- Honest output — metadata tells you exactly how the extraction went and how much to trust it

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
| Audio (`.mp3`, `.wav`, etc.) | 🔶 Optional | Requires OpenAI Whisper |
| Video (`.mp4`, `.mov`, etc.) | 🔶 Optional | Requires OpenAI Whisper + ffmpeg |

**Design principles:**
- Local-first — no cloud APIs needed for core functionality
- Graceful fallback over hard failure — every input produces valid output
- Honest output — metadata includes `support_level`, `usefulness_score`, and `extraction_status`

---

## Requirements

- [Bun](https://bun.sh) v1.0+

---

## Install

```bash
# Global install (requires Bun)
bun install -g md-anything

# Or run without installing
bunx md-anything <input>
```

---

## CLI

```bash
# Convert a single file or URL
md-anything <input>
md-anything convert <input>

# Convert and save to a file
md-anything convert report.pdf -o report.md

# Ingest all supported files in a folder
md-anything ingest ./notes

# Ingest and write .md files to an output directory
md-anything ingest ./notes -o ./output

# Ingest recursively
md-anything ingest ./vault -r -o ./output

# Check available optional tools
md-anything doctor

# Help
md-anything --help
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
extraction: pdftotext
extraction_status: ok
support_level: strong
usefulness_score: 0.80
---
```

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
    "extraction": "pdftotext",
    "extraction_status": "ok",
    "support_level": "best-effort",
    "usefulness_score": 0.8
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

# Audio/video transcription
pip install openai-whisper
```

Verify what's available:

```bash
md-anything doctor
```

---

## Development

```bash
git clone https://github.com/ojspace/md-anything
cd md-anything
bun install
bun test
bun run src/cli.ts doctor
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

---

## Personal usage guide

This is how I use md-anything day-to-day. Concrete workflows, not hypotheticals.

### Feed a book or research PDF into Claude

```bash
# Extract a PDF and pipe straight into a prompt
md-anything convert ~/Downloads/hacking-growth.pdf -o /tmp/book.md
# Then open book.md in Claude with: "Summarize the key growth frameworks"
```

### Ingest my Obsidian vault's reading inbox

```bash
# Turn all PDFs/EPUBs/URLs in a reading folder into linked Markdown notes
md-anything ingest ~/Documents/reading-inbox -r --index --graph -o ~/Obsidian/inbox/converted/
```

The `--index` flag generates `_index.md` — a Markdown table linking all converted notes.
The `--graph` flag adds entity extraction (people, places, concepts) to each note's metadata.

### Convert a YouTube talk to notes

```bash
md-anything convert "https://www.youtube.com/watch?v=EqhKw0Oro_k"
# If captions are available: full transcript → structured Markdown
# If not: honest fallback stub so you know why it's empty
```

### Pull a docs page for offline use or RAG

```bash
md-anything convert "https://hono.dev/docs/getting-started/basic" -o /tmp/hono-basics.md
```

### Transcribe a voice note or meeting recording

```bash
# Requires: pip install openai-whisper && brew install ffmpeg
md-anything convert ~/recordings/standup-2026-03-13.mp3 -o standup.md
md-anything convert ~/recordings/investor-call.mp4 -o investor-call.md
```

### Bulk-process a folder and check what happened

```bash
md-anything ingest ./notes --index -o ./output/
# _index.md shows every file: title, type, source — scan it to see what converted cleanly
```

### MCP inside Claude — no CLI needed

Once `.mcp.json` is in your project root, Claude can convert files directly:

> "Convert the PDF at ~/Downloads/report.pdf to Markdown so I can analyze it"

Claude calls `convert`, gets the Markdown, and uses it in context — without you leaving the chat.

### Set up optional tools once, get better results forever

```bash
brew install poppler tesseract ffmpeg
pip install openai-whisper
md-anything doctor  # verify everything is detected
```

After this, PDFs extract real text instead of stubs, images get OCR'd, and audio/video get transcribed.

---

## Contributing

1. Fork and branch from `main`
2. `bun install && bun run test:required` must be green before opening a PR
3. New input types go in `src/providers/` with a matching test in `tests/integration/`
4. Follow the support level model: `strong` / `best-effort` / `optional`

---

## License

MIT
