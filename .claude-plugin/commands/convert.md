---
description: Convert a file or URL to Markdown using md-anything
---

Convert the given input to Markdown using the `mda` CLI.

**Usage:** `/md-anything:convert <input>`

Where `<input>` is a file path or URL. Examples:
- `/md-anything:convert report.pdf`
- `/md-anything:convert "https://example.com/article"`
- `/md-anything:convert image.png`

## Steps

1. Run the conversion with JSON output for structured results:
   ```bash
   mda convert "$ARGUMENTS" --json
   ```

2. Parse the JSON response:
   - `input` — the original file path or URL
   - `markdown` — the converted Markdown content
   - `kind` — detected input type (pdf, url, image, epub, etc.)
   - `supportLevel` — `strong`, `best-effort`, or `optional`
   - `metadata` — extraction details including `extraction_status` and `usefulness_score`
   - `warnings` — optional guidance when results are weak or uncertain

3. Display the Markdown to the user.

4. If `supportLevel` is `best-effort` or `optional`, or if `extraction_status` is not `ok`, inform the user that results may be limited and suggest running `mda doctor` to see if optional tools can improve results.

## Notes

- If `mda` is not installed, instruct the user to run: `bun install -g md-anything`
- For PDFs, HTML, and plain URLs: expect strong results
- For images: results improve with `tesseract` installed
- For audio/video: `whisper-cpp` is preferred, `whisper` also works, and `OPENROUTER_API_KEY` is an opt-in remote fallback
