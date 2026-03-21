# CLAUDE.md

Local runbook for `md-anything`.

## What is actually shipped right now

- CLI: `mda`
- MCP server: `md-anything-mcp`
- No shipped HTTP API surface

## Quick start

```bash
git pull origin main
bun install
bun run lint
bun run build
bun run test:required
bun run src/cli.ts doctor
```

## Core commands

```bash
# Help and examples
mda --help
mda examples

# Convert one input
mda tests/fixtures/sample.txt
mda convert tests/fixtures/sample.txt
mda convert "https://example.com/article"

# JSON output for agents/scripts
mda convert tests/fixtures/sample.txt --json

# Batch conversion
mda ingest tests/fixtures
mda ingest tests/fixtures -o ./output
mda ingest tests/fixtures -r -o ./output

# Capability report
mda doctor

# MCP setup
mda mcp install claude
mda mcp install cursor
mda mcp install windsurf

# Direct MCP server
md-anything-mcp
```

## Important behavior notes

### CLI shape

Both forms are intentionally supported:

- `bun run src/cli.ts convert <input>`
- `bun run src/cli.ts <input>`

If you run `bun run src/cli.ts convert` with no input:

- stderr includes `Missing input for convert command.`
- exit code is `1`

### Guided CLI errors

The CLI is expected to steer users toward the right command:

- directory input points to `mda ingest <path>`
- unknown input suggests `mda --help` or `mda examples`
- weak extraction suggests `mda doctor`

Coverage lives in `tests/integration/cli-ux.test.ts`.

### Ingest reality

Current ingest behavior is simple:

- walks a folder
- converts supported files
- returns `converted`, `skipped`, `failed`, and per-doc metadata
- supports `-r` and `-o`

It does **not** currently support source manifests, `--graph`, or `--index`.

### MCP safety model

`src/mcp.ts` + `src/mcp-support.ts` enforce stricter rules than the CLI:

- local paths must stay inside the current workspace root
- only `http` / `https` URLs are allowed
- private and localhost URLs are blocked by default
- set `MDA_MCP_ALLOW_PRIVATE_URLS=1` only when intentionally overriding that policy

## Validation commands

```bash
# Main suite
bun test

# Script alias
bun run test

# Contributor-safe subset
bun run test:required

# Regenerate binary fixtures
bun run test:fixtures

# Type-check / lint
bun run lint

# Build distributable entrypoints
bun run build
```

Note: `test:all` is not defined in `package.json`.

## Useful smoke checks

```bash
bun run src/cli.ts --help
bun run src/cli.ts examples
bun run src/cli.ts doctor
bun run src/cli.ts convert tests/fixtures/sample.png
bun run src/cli.ts convert "https://www.youtube.com/watch?v=EqhKw0Oro_k"
bun run src/cli.ts convert "https://example.com/article"
```

## Optional tools

`doctor` is the source of truth for optional capability reporting.

```bash
brew install poppler         # pdftotext for stronger PDF extraction
brew install tesseract       # OCR for images
brew install --cask calibre  # ebook-convert for MOBI/AZW
brew install ffmpeg          # media extraction
brew install whisper-cpp     # local transcription (preferred)
whisper-cpp --download-model base.en
```

Also supported:

- `unzip` for EPUB extraction
- `whisper` via `pip install openai-whisper`
- `OPENROUTER_API_KEY` for opt-in remote image/audio/video fallbacks

Verify current machine state with:

```bash
command -v pdftotext
command -v tesseract
command -v ebook-convert
command -v unzip
command -v ffmpeg
command -v whisper-cpp
command -v whisper
```

## Troubleshooting

- If output says `Unsupported input type: unknown` and `Input: convert`, you likely passed `convert` as the input. Use `convert <input>` or just `<input>`.
- If EPUB extraction is weak, check `unzip` first.
- If media transcription is weak, run `mda doctor` and verify both transcription tooling and `ffmpeg`.
- URL and YouTube results vary with network access and source-side restrictions.
