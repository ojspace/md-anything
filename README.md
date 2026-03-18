# md-anything

Convert any file or URL to clean Markdown — for AI agents, local scripts, and batch pipelines.

Available as a **CLI** and **MCP server**.

[![CI](https://github.com/ojspace/md-anything/actions/workflows/ci.yml/badge.svg)](https://github.com/ojspace/md-anything/actions/workflows/ci.yml) ![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)

---

## Install

```bash
# Global install (requires Bun)
bun install -g md-anything

# Or run without installing
bunx md-anything <input>
```

Verify your setup:

```bash
mda doctor
```

---

## Setup with your AI tool

### Claude Code

Add to your project's `.mcp.json`:

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

Or install the Claude Code plugin for slash commands:

```bash
/plugin install ojspace/md-anything
```

Then use directly:

```
/md-anything:convert report.pdf
/md-anything:ingest ./notes
/md-anything:doctor
```

---

### Cursor

Add to `.cursor/mcp.json` (or your global `~/.cursor/mcp.json`):

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

Cursor will expose `convert`, `ingest`, and `doctor` as tools the AI can call.

---

### Windsurf

Add to `~/.codeium/windsurf/mcp_config.json`:

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

---

### VS Code (GitHub Copilot)

Add to `.vscode/mcp.json` in your workspace:

```json
{
  "servers": {
    "md-anything": {
      "type": "stdio",
      "command": "bunx",
      "args": ["md-anything-mcp"]
    }
  }
}
```

Or use the CLI via VS Code's integrated terminal — no setup needed.

---

### Codex (OpenAI)

Use via terminal in any Codex session. No special setup — just install globally:

```bash
bun install -g md-anything
mda convert <file-or-url>
```

Pipe output directly into your prompt context or redirect to a file:

```bash
mda convert report.pdf -o context.md
```

---

### Any MCP-compatible client (Zed, Antigravity, etc.)

Use the stdio transport with `bunx`:

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

If globally installed, use the binary directly:

```json
{
  "mcpServers": {
    "md-anything": {
      "command": "md-anything-mcp"
    }
  }
}
```

---

### Bash / terminal

```bash
mda report.pdf
mda convert "https://example.com/article"
mda convert "https://www.youtube.com/watch?v=EqhKw0Oro_k"
mda ingest ./notes -o ./output -r
mda doctor
```

---

## What it converts

| Input | Support | Notes |
|---|---|---|
| `.txt` | ✅ Strong | Plain text files |
| `.md` / `.markdown` | ✅ Strong | Passthrough |
| `.json` | ✅ Strong | Formatted code block |
| `.html` / `.htm` | ✅ Strong | Tag stripping + text extraction |
| URLs (`http://`, `https://`) | ✅ Strong | Fetch + HTML extraction |
| YouTube URLs | 🟡 Best-effort | Transcript-first; fallback note if unavailable |
| Images (`.png`, `.jpg`, `.webp`, `.gif`) | 🟡 Best-effort | Metadata + OCR if tesseract available |
| `.pdf` | ✅ Strong | unpdf zero-dep; pdftotext fallback; OCR hint |
| `.epub` | 🟡 Best-effort | Native ZIP extraction; spine-aware |
| `.mobi` / `.azw` | 🟡 Best-effort | Requires Calibre `ebook-convert` |
| Audio (`.mp3`, `.wav`, etc.) | 🔶 Optional | Local `whisper-cpp` or opt-in OpenRouter |
| Video (`.mp4`, `.mov`, etc.) | 🔶 Optional | Local `whisper-cpp` + `ffmpeg`, or opt-in OpenRouter |

---

## CLI reference

```bash
# Convert a single file or URL
mda <input>
mda convert <input>

# Convert and save to a file
mda convert report.pdf -o report.md

# Ingest all supported files in a folder
mda ingest ./notes
mda ingest ./notes -o ./output
mda ingest ./vault -r -o ./output   # recursive

# Check available optional tools
mda doctor

# See examples
mda examples

# Help
mda --help
```

### Options

| Flag | Default | Description |
|---|---|---|
| `-o, --output <path>` | stdout | Output file (convert) or directory (ingest) |
| `--frontmatter` | `true` | Include YAML frontmatter with metadata |
| `--json` | `false` | Machine-readable JSON output (for agent pipelines) |
| `-r, --recursive` | `false` | Process subdirectories (ingest only) |
| `-h, --help` | — | Show help |

### JSON output for agent pipelines

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
    "usefulness_score": 0.85
  },
  "warnings": []
}
```

---

## MCP tools

| Tool | Description |
|---|---|
| `convert` | Convert a file path or URL to Markdown |
| `ingest` | Batch-convert all files in a folder |
| `doctor` | Report available capabilities |

---

## Optional tools

Install these to unlock richer extraction:

```bash
brew install poppler        # better PDF text extraction
brew install tesseract      # image OCR
brew install --cask calibre # MOBI/ebook conversion
brew install ffmpeg         # video audio extraction
brew install whisper-cpp    # local audio/video transcription
whisper-cpp --download-model base.en
```

Set `OPENROUTER_API_KEY` to enable remote fallbacks for image/audio/video (opt-in, not required).

---

## Design principles

- **Local-first** — no cloud APIs needed for core functionality
- **Lightweight by default** — no models bundled, zero mandatory native deps
- **Graceful fallback** — every input produces valid output with honest metadata
- **Agent-ready** — stable `--json` contract, MCP server, packaged `SKILL.md`

---

## Development

```bash
git clone https://github.com/ojspace/md-anything
cd md-anything
bun install
bun test
bun run doctor
```

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

1. Add detection in `src/core/detect-input.ts`
2. Add a provider in `src/providers/`
3. Wire it into `src/core/route-input.ts`
4. Set a support level in `src/core/support-levels.ts`
5. Return a `NormalizedDocument` with honest fallback metadata
6. Add tests in `tests/integration/`

---

## Contributing

1. Fork and branch from `main`
2. `bun run test:required` must be green before opening a PR
3. New input types go in `src/providers/` with a matching test in `tests/integration/`
4. Follow the support level model: `strong` / `best-effort` / `optional`

---

## License

MIT
