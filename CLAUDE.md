# CLAUDE.md

Local runbook for using `md-anything` later without re-discovering commands.

## Quick start (copy/paste)

```bash
git pull origin main
bun install
bun test
bun run src/cli.ts doctor
```

## Test flow

```bash
# Main suite
bun test

# Same as above via script alias
bun run test

# Smaller required subset
bun run test:required

# Regenerate generated fixtures (PDF/EPUB, etc.)
bun run test:fixtures
```

Note: `test:all` is not currently defined in `package.json`.

## CLI usage

```bash
# Installed short alias
mda --help
mda examples
mda convert tests/fixtures/sample.txt
mda tests/fixtures/sample.txt

# Help (leads with "Common commands:" section)
bun run src/cli.ts --help

# Copy-paste examples
bun run src/cli.ts examples

# Health/capability check
bun run src/cli.ts doctor

# Ingest a folder
bun run src/cli.ts ingest tests/fixtures

# Convert one input (explicit subcommand)
bun run src/cli.ts convert tests/fixtures/sample.txt

# Convert one input (shorthand; still supported)
bun run src/cli.ts tests/fixtures/sample.txt
```

### Key fix (important)

`convert` is now a real subcommand. These both work:

- `bun run src/cli.ts convert <input>`
- `bun run src/cli.ts <input>`

If you run `bun run src/cli.ts convert` with no input, CLI returns:

- `Missing input for convert command.`
- Exit code `1`

### Guided errors

The CLI detects common mistakes and prints actionable messages:

- Directory passed as input → suggests `mda ingest <path>`
- Unknown file type → points to `--help` or `examples`
- Weak extraction (image/pdf/epub/audio/video) → suggests `doctor`

Tests: `tests/integration/cli-ux.test.ts`

## Real-world smoke checks

```bash
bun run src/cli.ts convert tests/fixtures/sample.png
bun run src/cli.ts convert "https://www.youtube.com/watch?v=EqhKw0Oro_k"
bun run src/cli.ts convert "https://edition.cnn.com/travel/japan-seto-inland-sea-shimanami-kaido"
```

## Optional external tools

`doctor` reports optional capabilities. Install as needed:

- Base install stays lightweight: no bundled Whisper models, no required cloud API
- Add native tools only for the formats you actually care about
- `OPENROUTER_API_KEY` is an opt-in remote fallback, not a default requirement

```bash
# PDF text extraction
brew install poppler

# OCR
brew install tesseract

# Media handling
brew install ffmpeg

# Audio/video transcription (preferred — C++, no Python, no OpenAI branding)
brew install whisper-cpp
# then: whisper-cpp --download-model base.en
# note: models are intentionally not bundled to keep md-anything lightweight

# MOBI/ebook conversion (provides ebook-convert)
brew install --cask calibre
```

Verify availability:

```bash
command -v pdftotext
command -v tesseract
command -v ebook-convert
command -v ffmpeg
command -v whisper-cpp
```

## Troubleshooting

- If output says `Unsupported input type: unknown` and `Input: convert`, you passed `convert` as the input accidentally. Use `convert <input>` or just `<input>`.
- URL/YouTube conversions may vary with network availability and source-site restrictions.
- Run `bun run src/cli.ts doctor` first when debugging environment issues.
