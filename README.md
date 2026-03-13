# md-anything

Convert anything to Markdown — files, URLs, YouTube videos, PDFs, EPUBs, images, and more.

## What it does

`md-anything` is a local-first CLI tool that extracts and normalizes content from virtually any source into clean, structured Markdown. It includes optional YAML frontmatter with metadata, a usefulness score, and support-level annotations so you always know what you're getting.

## Installation

Requires [Bun](https://bun.sh/).

```bash
git clone https://github.com/ojspace/md-anything
cd md-anything
bun install
```

Run directly:

```bash
bun run src/cli.ts <input>
```

Or link globally:

```bash
bun link
md-anything <input>
```

## Usage

### Convert a single file or URL

```bash
md-anything <file-or-url>
md-anything README.md
md-anything report.pdf
md-anything https://example.com/article
md-anything "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
```

### Write output to a file

```bash
md-anything report.pdf -o output.md
```

### Ingest all files in a folder

```bash
md-anything ingest ./documents
md-anything ingest ./documents -r          # recursive
md-anything ingest ./documents -o ./out    # write to output directory
```

### Check available capabilities

```bash
md-anything doctor
```

### Options

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--output <path>` | `-o` | stdout | Output file or directory |
| `--frontmatter` | | `true` | Include YAML frontmatter |
| `--graph` | | `false` | Enable graph enrichment |
| `--index` | | `false` | Generate index file for ingest |
| `--recursive` | `-r` | `false` | Process subdirectories |
| `--help` | `-h` | | Show help |

## Supported Input Formats

| Format | Extensions / Pattern | Support Level | Notes |
|--------|---------------------|---------------|-------|
| Plain text | `.txt` | **strong** | Direct passthrough |
| Markdown | `.md`, `.markdown` | **strong** | Direct passthrough |
| JSON | `.json` | **strong** | Formatted output |
| HTML | `.html`, `.htm` | **strong** | Tag stripping + entity decode |
| URL | `http://`, `https://` | **strong** | Fetch + HTML extraction |
| YouTube | `youtube.com`, `youtu.be` | best-effort | Transcript-first; graceful fallback |
| Image | `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif` | best-effort | Metadata + OCR if tesseract available |
| PDF | `.pdf` | best-effort | Text extraction via pdftotext; fallback note if unavailable |
| EPUB | `.epub` | best-effort | Native ZIP extraction, spine-aware |
| MOBI / AZW | `.mobi`, `.azw`, `.azw3` | best-effort | Requires Calibre `ebook-convert` |
| Audio | `.mp3`, `.wav`, `.ogg`, `.m4a`, `.flac` | optional | Requires [Whisper](https://github.com/openai/whisper) |
| Video | `.mp4`, `.mov`, `.avi`, `.mkv`, `.webm` | optional | Requires Whisper + ffmpeg |

**Support levels:**
- **strong** — works out of the box, fully tested, reliable output.
- **best-effort** — works with available tools; produces a graceful fallback note if a required tool is missing.
- **optional** — requires an optional external tool; clearly flagged when unavailable.

## Optional Dependencies

Install these to unlock additional capabilities:

| Tool | Purpose | Install |
|------|---------|---------|
| [tesseract-ocr](https://github.com/tesseract-ocr/tesseract) | OCR for images | `sudo apt install tesseract-ocr` |
| [poppler-utils](https://poppler.freedesktop.org/) (`pdftotext`) | PDF text extraction | `sudo apt install poppler-utils` |
| [Calibre](https://calibre-ebook.com/) (`ebook-convert`) | MOBI / AZW conversion | `sudo apt install calibre` |
| [unzip](https://linux.die.net/man/1/unzip) | EPUB extraction | `sudo apt install unzip` |
| [Whisper](https://github.com/openai/whisper) | Audio / video transcription | `pip install openai-whisper` |

Run `md-anything doctor` to see which tools are detected on your system.

## Source Manifests

You can create a `sources.txt` or `sources.json` file listing URLs or file paths to ingest in batch:

**sources.txt**
```
https://example.com/article-1
./local-report.pdf
./notes.md
```

**sources.json**
```json
[
  "https://example.com/article-1",
  "./local-report.pdf",
  "./notes.md"
]
```

Then run:

```bash
md-anything ingest .
```

## Output Format

Each converted document includes YAML frontmatter (when `--frontmatter` is enabled):

```yaml
---
title: My Document
source: ./my-document.pdf
source_type: pdf
extraction: pdftotext
extraction_status: ok
support_level: best-effort
usefulness_score: 0.87
---

# My Document

...content...
```

## Development

```bash
# Type-check
bun run lint

# Run required tests (no optional tools needed)
bun run test:required

# Bootstrap generated fixtures (PDF, EPUB), then run full suite
bun run test:fixtures && bun test
```

## Design Principles

- **Local-first**: No cloud APIs required for core functionality.
- **BYOK optional**: Key-based services (LLMs, cloud OCR) may be added later, opt-in only.
- **Transcript-first YouTube**: Prefer captions/transcripts; no audio download unless explicitly requested.
- **Graceful fallback over hard failure**: Every input type produces a valid, non-empty output.
- **Useful output over perfect extraction**: A weak but honest note is better than a hard failure.

## License

[MIT](./LICENSE)
