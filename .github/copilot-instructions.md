# Copilot instructions for `md-anything`

## Build, test, and lint commands

Use Bun throughout this repository.

```bash
bun install
bun run lint
bun run build

# Full suite
bun test
bun run test

# Contributor-safe required subset
bun run test:required

# Regenerate generated PDF/EPUB fixtures when needed
bun run test:fixtures

# Run a single test file
bun test tests/unit/detect-input.test.ts

# Run one test by name
bun test tests/integration/convert-text.test.ts -t "converts .txt file to markdown"

# Live/network tests
LIVE_TESTS=1 bun test tests/integration/youtube-live.test.ts tests/integration/url-live.test.ts
```

When debugging optional local tool support, run `bun run src/cli.ts doctor`.

## High-level architecture

- `src/cli.ts` and `src/mcp.ts` are the shipped entry points. They both build a runtime with `createRuntimeProviders(DEFAULT_CONFIG)` and delegate to shared core logic instead of implementing format-specific behavior themselves.

- The main conversion path lives in `src/core/convert.ts`: validate with `ConvertRequestSchema`, detect the input kind, route with `routeInput`, normalize quality metadata with `finalizeDocument`, attach chunk/provenance data, and render Markdown with `formatMarkdown`.

- `src/providers/*` contains one converter per input kind. Providers return a `NormalizedDocument`; they should not format final Markdown themselves.

- Runtime capability checks are centralized in `src/core/runtime.ts`. Optional tools such as `tesseract`, `pdftotext`, `ebook-convert`, `unzip`, `ffmpeg`, `whisper-cpp`, and `whisper` are detected once and then passed through the runtime so providers can gate behavior consistently.

- `src/core/ingest.ts` walks supported files in a folder, converts them through the shared pipeline, and returns counts plus per-document metadata. It does not currently process source manifests or generate graph/index artifacts.

- `src/mcp-support.ts` is the MCP policy layer: it restricts local paths to the current workspace root, blocks private URLs by default, and defines structured tool output, resources, and prompts.

- `src/formatters/markdown.ts` owns the final output shape. Frontmatter is on by default and is where extraction metadata, `support_level`, and `usefulness_score` become part of emitted Markdown.

## Key conventions

- Preserve the repository's "graceful over correct" behavior documented in `README.md`: weak extraction should still return non-empty Markdown with explicit metadata and notes, not a hard failure or empty document.

- Keep CLI and MCP behavior aligned by changing shared logic in `src/core/*` or `src/providers/*`. If a behavior change only lives in one entry point, it will drift from the other surface.

- Keep metadata responsibilities split the same way the code does today:
  - providers set extraction-specific metadata such as `extraction`, `extraction_status`, and provider details
  - `finalizeDocument()` adds usefulness scoring and low-confidence notes
  - `convertToMarkdown()` adds `support_level`, conversion metadata, and doctor warnings
  - chunk/provenance helpers attach document ids and section-aware chunks after normalization

- Do not regress the CLI command shape. Both of these are intentionally supported:

```bash
bun run src/cli.ts convert <input>
bun run src/cli.ts <input>
```

`bun run src/cli.ts convert` with no input should continue to fail with exit code `1`.

- Keep required tests separate from capability-gated or live tests. `test:required` is the baseline contributor workflow and should stay green without exotic local tooling. Optional-tool coverage belongs in `bun test` or `test:live`, not in the required subset.

- Preserve the fixture strategy:
  - committed source fixtures live in `tests/fixtures`
  - generated binary fixtures live in `tests/generated-fixtures`
  - `bun run test:fixtures` regenerates the generated fixtures

- If you touch MCP behavior, preserve the current safety defaults:
  - workspace file access stays inside the current workspace root
  - private/localhost URLs stay blocked unless `MDA_MCP_ALLOW_PRIVATE_URLS=1`
  - structured MCP responses continue to include Markdown plus metadata/provenance/chunks
