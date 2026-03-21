# md-anything

Convert files, URLs, and media into honest Markdown for terminal workflows and MCP-powered agents.

`md-anything` currently ships two surfaces:

- a local-first CLI: `mda`
- a stdio MCP server: `md-anything-mcp`

[![npm version](https://img.shields.io/npm/v/md-anything.svg)](https://www.npmjs.com/package/md-anything) [![npm downloads](https://img.shields.io/npm/dm/md-anything.svg)](https://www.npmjs.com/package/md-anything) [![CI](https://github.com/ojspace/md-anything/actions/workflows/ci.yml/badge.svg)](https://github.com/ojspace/md-anything/actions/workflows/ci.yml) [![GitHub stars](https://img.shields.io/github/stars/ojspace/md-anything.svg?style=social)](https://github.com/ojspace/md-anything/stargazers) ![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/ojspace/md-anything/main/install.sh | bash
```

Or install globally with Bun or npm:

```bash
bun install -g md-anything
npm install -g md-anything
```

Quick sanity check:

```bash
mda --help
mda doctor
```

## Quick start

```bash
# Convert one file or URL
mda tests/fixtures/sample.txt
mda convert report.pdf
mda convert "https://example.com/article"

# Batch-convert a folder
mda ingest ./notes -o ./output -r

# Check optional tool availability
mda doctor

# Copy-paste examples
mda examples
mda demo
```

## What is supported

`md-anything` uses three support levels:

- `strong`: works well out of the box
- `best-effort`: useful, but quality depends on content and local tools
- `optional`: requires extra tools or an opt-in remote fallback

| Input | Support | Notes |
|---|---|---|
| `.txt`, `.md`, `.markdown`, `.json`, `.html`, `.htm` | strong | Native or straightforward extraction |
| `http://` / `https://` URLs | strong | Fetch + HTML extraction |
| `.pdf` | strong | `unpdf` by default, `pdftotext` can improve some files |
| YouTube URLs | best-effort | Transcript-first, honest fallback when unavailable |
| Images (`.png`, `.jpg`, `.webp`, `.gif`, etc.) | best-effort | Metadata-only by default, OCR with `tesseract`, richer remote fallback via OpenRouter |
| `.epub` | best-effort | Extraction depends on `unzip`; `doctor` will tell you if it is missing |
| `.mobi`, `.azw` | best-effort | Requires Calibre `ebook-convert` |
| Audio (`.mp3`, `.wav`, etc.) | optional | Local `whisper-cpp` or `whisper`, optional OpenRouter fallback |
| Video (`.mp4`, `.mov`, etc.) | optional | Requires `ffmpeg` plus `whisper-cpp` / `whisper`, optional OpenRouter fallback |

## CLI reference

```bash
# Single input
mda <input>
mda convert <input>

# Write Markdown to a file
mda convert report.pdf -o report.md

# Omit frontmatter
mda convert report.pdf --no-frontmatter

# Machine-readable JSON
mda convert report.pdf --json

# Batch-convert a folder
mda ingest ./notes
mda ingest ./notes -o ./output
mda ingest ./vault -r -o ./output

# Environment/capability checks
mda doctor

# Help and examples
mda --help
mda examples
mda demo
```

### Flags

| Flag | Description |
|---|---|
| `-o, --output <path>` | Output file for `convert` or output directory for `ingest` |
| `--no-frontmatter` | Omit YAML frontmatter from generated Markdown |
| `--json` | Return machine-readable JSON instead of Markdown |
| `-r, --recursive` | Recurse into subdirectories during `ingest` |
| `-h, --help` | Show help |

### JSON output

`convert --json` returns a stable machine-readable envelope:

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
    "extraction": "unpdf",
    "extraction_status": "ok",
    "support_level": "strong",
    "usefulness_score": 0.85
  },
  "provenance": {
    "documentId": "..."
  },
  "warnings": []
}
```

`ingest --json` returns counts plus per-document metadata:

```bash
mda ingest ./notes --json
```

```json
{
  "converted": 12,
  "skipped": 2,
  "failed": 0,
  "docs": [
    {
      "fileName": "note.md",
      "title": "My Note",
      "summary": "This is a summary of the note.",
      "sourceType": "pdf",
      "source": "report.pdf",
      "chunks": [],
      "metadata": {
        "extraction_status": "ok"
      },
      "provenance": {
        "documentId": "..."
      }
    }
  ]
}
```

Argument errors stay machine-readable too:

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

## MCP server

### One-command setup

```bash
mda mcp install claude        # Claude Desktop
mda mcp install claude-code   # Claude Code CLI
mda mcp install cursor        # Cursor
mda mcp install windsurf      # Windsurf
mda mcp install vscode        # VS Code + GitHub Copilot (writes .vscode/mcp.json)
mda mcp install antigravity   # Antigravity (writes .vscode/mcp.json)
mda mcp install opencode      # OpenCode
```

Restart the client after install. For VS Code, open Command Palette → `MCP: List Servers` to verify.

> **Requires Bun in PATH.** Install globally with `bun install -g md-anything` so `md-anything-mcp` is available.
> If you used `install.sh`, only the `mda` binary is installed — use `bunx md-anything-mcp` in manual configs below.

### Manual config

**Claude Desktop / Claude Code / Cursor / Windsurf / OpenCode** (`mcpServers` format):

```json
{
  "mcpServers": {
    "md-anything": {
      "command": "md-anything-mcp"
    }
  }
}
```

Config file locations:

| Client | Config path |
|---|---|
| Claude Desktop (macOS) | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Claude Desktop (Linux) | `~/.config/Claude/claude_desktop_config.json` |
| Claude Code | `~/.claude/settings.json` |
| Cursor | `~/.cursor/mcp.json` |
| Windsurf | `~/.codeium/windsurf/mcp_config.json` |
| OpenCode | `~/.config/opencode/config.json` |

**VS Code / GitHub Copilot / Antigravity** — create `.vscode/mcp.json` in your workspace:

```json
{
  "servers": {
    "md-anything": {
      "type": "stdio",
      "command": "md-anything-mcp"
    }
  }
}
```

**Using `bunx` instead of a global install:**

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

### Tools

| Tool | Description |
|---|---|
| `convert` | Convert a workspace file or safe remote URL to Markdown |
| `ingest` | Batch-convert a workspace folder |
| `doctor` | Report current capabilities and optional upgrades |

The server also exposes resources (`md-anything://doctor`, `md-anything://workspace/{path}`) and prompts (`analyze_document`, `summarize_document_chunks`).

### MCP safety rules

- local paths must stay inside the current workspace root
- only `http://` and `https://` URLs are allowed
- private, localhost, and link-local URLs are blocked by default
- set `MDA_MCP_ALLOW_PRIVATE_URLS=1` to override (use with caution)

## Optional local and remote upgrades

The default install stays lightweight. No models are bundled, and cloud fallbacks are opt-in.

Install only what you need:

```bash
brew install poppler         # pdftotext for stronger PDF extraction
brew install tesseract       # OCR for images
brew install --cask calibre  # ebook-convert for MOBI/AZW
brew install ffmpeg          # media extraction for video/audio workflows
brew install whisper-cpp     # local transcription (preferred)
whisper-cpp --download-model base.en
```

Also supported:

- `unzip` for EPUB extraction
- `whisper` (`pip install openai-whisper`) as a transcription fallback
- `OPENROUTER_API_KEY` as an opt-in remote fallback for image, audio, and video workflows

Use `mda doctor` to see exactly what your machine can do right now.

## Why it is built this way

- **Local-first by default**: core workflows work without cloud APIs
- **Graceful fallback**: weak extraction still returns honest Markdown instead of a hard failure
- **Agent-ready**: CLI JSON output, chunk/provenance metadata, and an MCP server all share the same core pipeline
- **Lightweight**: optional tools upgrade specific formats without turning the base install into a heavyweight bundle

## Development

```bash
git clone https://github.com/ojspace/md-anything
cd md-anything
bun install
```

Validate changes with:

```bash
bun run lint
bun run build
bun run test:required
```

Other useful commands:

```bash
bun test
bun run test
bun run test:fixtures
bun run src/cli.ts doctor
```

### Project layout

```text
src/
  cli.ts            CLI entry point
  mcp.ts            MCP stdio server
  mcp-support.ts    MCP path/url guardrails and structured content helpers
  core/             shared conversion, ingest, runtime, chunks, usefulness
  providers/        one provider per input kind
  formatters/       final Markdown rendering
tests/
  unit/
  integration/
  fixtures/
  generated-fixtures/
```

## License

MIT
