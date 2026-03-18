# md-anything

Convert anything to Markdown — files, URLs, YouTube videos, PDFs, EPUBs, images, and more.

Available as a **CLI**, an **MCP server** (for Claude, Cursor, and other AI tools), and an **HTTP API**.

[![CI](https://github.com/ojspace/md-anything/actions/workflows/ci.yml/badge.svg)](https://github.com/ojspace/md-anything/actions/workflows/ci.yml)

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

## Why I built this

I run AI agent workflows in [Claude Code](https://claude.ai/code) and [OpenClaw](https://openclaw.dev). The agents need to read things — PDFs, docs pages, YouTube talks, EPUB books, audio notes. Every format is a different API, a different failure mode, a different stub to write.

I needed one reliable primitive: give it anything, get back clean Markdown. Something local-first with no cloud dependency, that works offline for files, and never hard-crashes — if extraction is weak, it returns a useful stub with honest metadata instead of throwing.

I built it to make my own agent pipelines faster and more reliable. Once it was solid enough, I open-sourced it — the same problem shows up in every serious agent workflow.

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

## What to expect

- **Works best today:** text, markdown, JSON, HTML, normal web pages, and most PDFs
- **Best-effort by design:** YouTube, images, EPUB, and MOBI
- **Optional-tool upgrades:** `tesseract`, `pdftotext`, `ebook-convert`, and `whisper` improve some formats but are not required for the default workflow
- **Weak outputs stay honest:** low-confidence results include extraction notes and metadata so you can decide whether to trust, retry, or install optional tools

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
# Requires: brew install whisper-cpp ffmpeg (then: whisper-cpp --download-model base.en)
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

### Set up optional tools once, get better results forever

```bash
brew install poppler tesseract ffmpeg whisper-cpp
whisper-cpp --download-model base.en
mda doctor  # verify everything is detected
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
