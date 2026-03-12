# md-anything — Engineering Control Document

> Internal planning document. Not marketing material.

## Product Principles

- **Local-first by default**: No cloud APIs required for core functionality.
- **BYOK optional**: Key-based services (LLMs, cloud OCR) may be added later, opt-in only.
- **Transcript-first YouTube**: Prefer captions/transcripts; no audio download unless explicitly requested.
- **Useful output over perfect extraction**: A weak but honest note is better than a hard failure.
- **Graceful fallback over hard failure**: Every input type must produce a valid, non-empty output.
- **Tests before public polish**: Required tests must be green before docs/marketing.
- **Capability-gated optional tools**: OCR, ebook-convert, whisper, playwright are optional extras — never required for the default contributor workflow.

## Support Level Model

| Level | Meaning |
|---|---|
| `strong` | Works out of the box, fully tested, reliable output |
| `best-effort` | Works with available tools, graceful fallback if not |
| `optional` | Requires optional external tools, clearly flagged |

## Input Support Matrix

| Input Kind | Support Level | Notes |
|---|---|---|
| text | strong | Plain text files |
| markdown | strong | Passthrough |
| json | strong | JSON-formatted output |
| html | strong | Strip + extract |
| url | strong | Fetch + HTML extraction |
| youtube | best-effort | Transcript-first; graceful fallback |
| image | best-effort | Metadata + optional OCR (tesseract) |
| pdf | best-effort | Text-first via pdftotext; fallback note |
| epub | best-effort | Native ZIP extraction; spine-aware |
| mobi | best-effort | Calibre ebook-convert; skip if unavailable |
| audio | optional | Requires whisper |
| video | optional | Requires whisper/ffmpeg |

## Required vs Optional Tests

### Required (must pass on a normal contributor machine)
- Unit: detect-input, support-levels, usefulness, is-source-manifest
- Integration: convert-text, convert-image (baseline), youtube-fallback (mocked), url-fallback (offline), ingest-source-manifest, usefulness-metadata

### Optional / Capability-gated
- EPUB (requires zip tool) — auto-bootstraps if `zip` is available
- PDF with pdftotext — skipped if pdftotext unavailable
- MOBI — skipped if ebook-convert unavailable
- Live URL tests (CNN, YouTube) — clearly marked as live/flaky

## Fixture Strategy

- Text fixtures: committed in `tests/fixtures/` as normal files
- Binary fixtures: generated into `tests/generated-fixtures/` (gitignored)
- Bootstrap: `bun run test:fixtures` regenerates binary fixtures
- Auto-bootstrap: integration tests attempt bootstrap if fixtures missing

## Release Quality Gates (before docs)

- [ ] `bun run test:required` passes on a fresh clone
- [ ] `bun run test:fixtures && bun run test` passes when tools available
- [ ] `bun run doctor` output is accurate for detected capabilities
- [ ] Sample PNG image produces valid Markdown output
- [ ] Generated PDF/EPUB produce valid output (strong when tools available, fallback otherwise)
- [ ] Source manifest ingest tested end-to-end
- [ ] YouTube fallback validated with real URL regression target
- [ ] CNN URL validated as url-kind with fallback structure
- [ ] All input types carry support_level and usefulness_score in metadata
- [ ] No hard failures for any supported input kind

## Current Remaining Work

- [x] Core architecture
- [x] Input detection (all types)
- [x] Support-level metadata
- [x] All input providers with graceful fallback
- [x] Source manifest support
- [x] Usefulness evaluation + finalization
- [x] Doctor capability reporting
- [x] Generated fixture bootstrap
- [x] Required test suite
- [ ] Live YouTube transcript regression (real URL: EqhKw0Oro_k)
- [ ] Live CNN URL regression
- [ ] CI workflow
- [ ] README / docs (after quality gates pass)

## Definition of Done (v1)

> All quality gates above are green.
> The tool is honest about what it supports.
> A contributor can clone the repo, run `bun install && bun test`, and get green tests without any exotic tools.
