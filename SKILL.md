---
name: md-anything
description: Convert any file, URL, or media to clean Markdown. Supports PDF, EPUB, HTML, images (OCR), YouTube, audio/video transcription, and more. Use `mda doctor` to check available capabilities.
---

# md-anything

Convert anything to Markdown — CLI, MCP server, and HTTP API.

**Install:** `bun install -g md-anything` or `npm install -g md-anything`

## Command Groups

### convert
Convert a single file or URL to Markdown.

```bash
mda <input>
mda convert <input>
mda convert <input> -o output.md
mda convert "https://example.com/article"
mda convert report.pdf
mda convert image.png
mda convert video.mp4
mda convert "https://www.youtube.com/watch?v=..."
```

### ingest
Batch-convert all supported files in a folder.

```bash
mda ingest ./notes
mda ingest ./notes -o ./output
mda ingest ./vault -r -o ./output        # recursive
mda ingest ./notes --graph --index       # entity extraction + index
```

### doctor
Report available capabilities and optional tool status.

```bash
mda doctor
```

## Options

| Flag | Default | Description |
|------|---------|-------------|
| `-o, --output <path>` | stdout | Output file (convert) or directory (ingest) |
| `--frontmatter` | `true` | Include YAML frontmatter with metadata |
| `--json` | `false` | Output JSON instead of Markdown (for agent pipelines) |
| `--graph` | `false` | Extract entities and relations (ingest only) |
| `--index` | `false` | Generate `_index.md` table of contents (ingest only) |
| `-r, --recursive` | `false` | Process subdirectories (ingest only) |

## Supported Input Types

| Type | Support | Notes |
|------|---------|-------|
| `.txt`, `.md`, `.json` | strong | Native |
| `.html`, URLs | strong | Fetch + HTML extraction |
| `.pdf` | strong | unpdf zero-dep; pdftotext fallback |
| `.epub` | best-effort | Native ZIP extraction |
| Images (`.png`, `.jpg`, etc.) | best-effort | Metadata + OCR if tesseract installed |
| YouTube URLs | best-effort | Transcript-first; honest fallback |
| `.mobi` / `.azw` | best-effort | Requires Calibre ebook-convert |
| Audio (`.mp3`, `.wav`, etc.) | optional | Requires OpenAI Whisper |
| Video (`.mp4`, `.mov`, etc.) | optional | Requires Whisper + ffmpeg |

## JSON Output (Agent Pipelines)

Use `--json` to get structured output consumable in agent workflows:

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
    "title": "Report Title",
    "source": "report.pdf",
    "extraction": "unpdf",
    "extraction_status": "ok",
    "support_level": "strong",
    "usefulness_score": 0.85
  },
  "warnings": []
}
```

For ingest:

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

Weak or uncertain results still return JSON, with warnings instead of silent failure:

```json
{
  "input": "unknown-input.foo",
  "markdown": "# ...",
  "kind": "unknown",
  "supportLevel": "optional",
  "metadata": {
    "extraction_status": "weak"
  },
  "warnings": [
    "Could not detect a supported input type for \"unknown-input.foo\".",
    "Try `mda --help` or `mda examples` for supported usage."
  ]
}
```

Argument errors are also machine-readable:

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

## MCP Server

Add to `.mcp.json` for use inside Claude, Cursor, or other MCP hosts:

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

## HTTP API

```bash
md-anything-server          # starts on port 3000
```

Endpoints: `GET /doctor`, `POST /convert`, `POST /ingest`

## Ecosystem Compatibility

md-anything is intentionally designed to work well in agent ecosystems that need:

- a stable CLI entrypoint
- machine-readable JSON output
- package-shipped skill metadata
- local execution with optional capability upgrades

That makes it a good fit for package-scan discovery systems, Claude Code plugin flows, and ClawHub/OpenClaw-style skill ecosystems.
