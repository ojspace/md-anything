---
name: md-anything
description: Convert files, URLs, and media to Markdown with a local-first CLI and MCP server. Use `mda doctor` to see what this machine can actually extract well.
---

# md-anything

Convert files, URLs, and media into Markdown for agent workflows and local automation.

**Install:** `bun install -g md-anything` or `npm install -g md-anything`

## Quick commands

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
mda ingest ./vault -r -o ./output
```

### doctor / examples
Report capabilities or see copy-paste examples.

```bash
mda doctor
mda examples
mda demo
```

> [!NOTE]
> `mda mcp install` assumes `md-anything-mcp` is in your `PATH`.
> For binary-only installs, use the manual config shown below with `bunx`.

## Options

| Flag | Default | Description |
|------|---------|-------------|
| `-o, --output <path>` | stdout | Output file (convert) or directory (ingest) |
| `--no-frontmatter` | `false` | Omit YAML frontmatter from Markdown output |
| `--json` | `false` | Output JSON instead of Markdown (for agent pipelines) |
| `-r, --recursive` | `false` | Process subdirectories (ingest only) |

## Supported Input Types

| Type | Support | Notes |
|------|---------|-------|
| `.txt`, `.md`, `.json` | strong | Native |
| `.html`, URLs | strong | Fetch + HTML extraction |
| `.pdf` | strong | unpdf zero-dep; pdftotext fallback |
| `.epub` | best-effort | Uses `unzip`; falls back honestly when extraction is weak |
| Images (`.png`, `.jpg`, etc.) | best-effort | Metadata + OCR if tesseract installed |
| YouTube URLs | best-effort | Transcript-first; honest fallback |
| `.mobi` / `.azw` | best-effort | Requires Calibre ebook-convert |
| Audio (`.mp3`, `.wav`, etc.) | optional | Local `whisper-cpp` / `whisper`, or opt-in remote fallback |
| Video (`.mp4`, `.mov`, etc.) | optional | `ffmpeg` plus local transcription, or opt-in remote fallback |

## Capability Layers

md-anything is designed to stay lightweight by default:

- Core mode: useful with zero extra native tools
- Local upgrade mode: add `tesseract`, `pdftotext`, `whisper-cpp`, `ffmpeg`, or `ebook-convert` as needed
- Remote enhancement mode: set `OPENROUTER_API_KEY` only if you explicitly want remote image/audio/video fallbacks

No local models are bundled in the package. Heavy media capabilities remain optional layers, not requirements.

## JSON Output

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
  "chunks": [],
  "metadata": {
    "title": "Report Title",
    "source": "report.pdf",
    "extraction": "unpdf",
    "extraction_status": "ok",
    "support_level": "strong",
    "usefulness_score": 0.85
  },
  "provenance": { "documentId": "..." },
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

The MCP server exposes:

- tools: `convert`, `ingest`, `doctor`
- resources: `md-anything://doctor`, `md-anything://workspace-policy`, `md-anything://workspace/{path}`
- prompts: `analyze_document`, `summarize_document_chunks`

Safety defaults for MCP:

- local paths must stay inside the current workspace
- only `http://` and `https://` URLs are allowed
- private and localhost URLs are blocked unless `MDA_MCP_ALLOW_PRIVATE_URLS=1`

## Ecosystem Compatibility

md-anything is intentionally designed to work well in agent ecosystems that need:

- a stable CLI entrypoint
- machine-readable JSON output
- package-shipped skill metadata
- local execution with optional capability upgrades

That makes it a good fit for package-scan discovery systems, Claude Code plugin flows, and ClawHub/OpenClaw-style skill ecosystems.
