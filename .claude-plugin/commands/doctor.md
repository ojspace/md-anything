---
description: Check md-anything capabilities and available optional tools
---

Run the md-anything doctor to report available capabilities and optional tool status.

**Usage:** `/md-anything:doctor`

## Steps

1. Run:
   ```bash
   mda doctor
   ```

2. Display the full output to the user — it shows:
     - Core support levels (which input types are strong vs best-effort vs optional)
     - Which optional tools are installed: `tesseract`, `pdftotext`, `ebook-convert`, `unzip`, `ffmpeg`, `whisper-cpp`, `whisper`
    - Actionable install suggestions for anything missing

3. If any optional tools are missing that the user's workflow needs, show the relevant install command:
    - Images/OCR: `brew install tesseract`
    - Better PDF: `brew install poppler`
    - MOBI/ebooks: `brew install --cask calibre`
    - EPUB: ensure `unzip` is available
    - Audio/video (preferred): `brew install whisper-cpp && whisper-cpp --download-model base.en`
    - Audio/video (fallback): `pip install openai-whisper`
    - Video extraction: `brew install ffmpeg`

## Notes

- If `mda` is not installed, instruct the user to run: `bun install -g md-anything`
- `OPENROUTER_API_KEY` is an opt-in remote enhancement, not a default requirement
- Doctor output reflects the current machine's environment — results vary by system
