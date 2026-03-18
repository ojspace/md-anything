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

- `src/cli.ts`, `src/mcp.ts`, and `src/server.ts` are thin entry points. They all build a runtime with `createRuntimeProviders(DEFAULT_CONFIG)` and delegate to shared core functions instead of implementing format-specific behavior themselves.

- The main conversion path lives in `src/core/convert.ts`: validate the request with `ConvertRequestSchema`, detect the input kind, route to a provider with `routeInput`, normalize quality metadata with `finalizeDocument`, then render Markdown with `formatMarkdown`.

- `src/providers/*` contains one converter per input kind (`text`, `html`, `url`, `youtube`, `image`, `pdf`, `epub`, `mobi`, `audio`, `video`). Providers return a `NormalizedDocument`; they do not format final Markdown themselves.

- Runtime capability checks are centralized in `src/core/runtime.ts`. Optional tools such as `tesseract`, `pdftotext`, `ebook-convert`, and `whisper` are detected once and then passed through the shared runtime so providers can gate behavior consistently.

- `src/core/ingest.ts` reuses the same detect/route/finalize flow for batch conversion. It treats `sources.txt` and `sources.json` inside an ingest folder as first-class inputs, and can optionally add graph data and an `_index.md` document.

- `src/formatters/markdown.ts` owns the final output shape. Frontmatter is on by default and is where extraction metadata, `support_level`, and `usefulness_score` become part of the emitted Markdown.

## Key conventions

- Preserve the repository's "graceful over correct" behavior documented in `README.md`: weak extraction should still return non-empty Markdown with explicit metadata and notes, not a hard failure or empty document.

- Keep CLI, MCP, and HTTP behavior aligned by changing shared logic in `src/core/*` or `src/providers/*`. If a behavior change only lives in one entry point, it will drift from the other two surfaces.

- Keep metadata responsibilities split the same way the code does today:
  - providers set extraction-specific metadata such as `extraction`, `extraction_status`, and provider details
  - `finalizeDocument()` adds usefulness scoring and low-confidence notes
  - `convertToMarkdown()` adds `support_level`

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

- If you touch ingest behavior, preserve source manifest support exactly as tested:
  - line-based `sources.txt` ignores blank lines and `#` comments
  - JSON manifests can be either `["..."]` or `{ "sources": ["..."] }`
