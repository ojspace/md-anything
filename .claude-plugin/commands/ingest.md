---
description: Batch-convert all supported files in a folder to Markdown
---

Batch-convert all supported files in a folder using the `mda` CLI.

**Usage:** `/md-anything:ingest <folder> [options]`

Examples:
- `/md-anything:ingest ./notes`
- `/md-anything:ingest ./vault -r` — recursive
- `/md-anything:ingest ./notes -o ./output -r` — write files to output dir

## Steps

1. Run ingest with JSON output:
   ```bash
   mda ingest "$ARGUMENTS" --json
   ```

2. Parse the JSON response:
    - `converted` — number of files successfully converted
    - `skipped` — files that were skipped (unsupported or already up to date)
    - `failed` — files that failed
    - `docs` — array of `{ fileName, title, sourceType, source, metadata }`

3. Report a summary to the user: how many converted, skipped, failed.

4. If any files failed, list them and suggest `mda doctor` to check optional tool availability.

## Useful flags to pass through from the user's request

- `-r` or `--recursive` — process subdirectories
- `-o <dir>` — write `.md` files to an output directory
- `--graph` — extract entities and relations into metadata
- `--index` — generate `_index.md` table of contents

## Notes

- If `mda` is not installed, instruct the user to run: `bun install -g md-anything`
- Source manifests: if a `sources.txt` or `sources.json` exists in the folder, those URLs are fetched and converted too
