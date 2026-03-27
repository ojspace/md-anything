import { detectCapabilities, checkBinary, findWhisperCppModel, type RuntimeCapabilities } from "./runtime";

interface Capability {
  name: string;
  available: boolean;
  description: string;
  required: boolean;
  note?: string;
}

function buildCapabilities(): Capability[] {
  const whisperCppInstalled = checkBinary("whisper-cpp");
  const whisperCppModel = findWhisperCppModel();
  const whisperCppReady = whisperCppInstalled && whisperCppModel !== null;
  const whisperPyInstalled = checkBinary("whisper");
  const ffmpegAvailable = checkBinary("ffmpeg");
  const tesseractAvailable = checkBinary("tesseract");
  const pdftotextAvailable = checkBinary("pdftotext");
  const ebookConvertAvailable = checkBinary("ebook-convert");
  const unzipAvailable = checkBinary("unzip");
  const pandocAvailable = checkBinary("pandoc");
  const libreOfficeAvailable = checkBinary("soffice") || checkBinary("libreoffice");
  const openRouterApiKey = process.env.OPENROUTER_API_KEY ?? null;

  return [
    {
      name: "tesseract",
      available: tesseractAvailable,
      description: "OCR for image text extraction",
      required: false,
      note: "optional local upgrade — keeps image OCR private and offline",
    },
    {
      name: "pdftotext",
      available: pdftotextAvailable,
      description: "PDF text extraction (poppler-utils)",
      required: false,
      note: "optional local upgrade — improves some PDFs beyond the zero-dependency path",
    },
    {
      name: "ebook-convert",
      available: ebookConvertAvailable,
      description: "MOBI/ebook conversion (Calibre)",
      required: false,
    },
    {
      name: "pandoc",
      available: pandocAvailable,
      description: "PPTX/presentation conversion (brew install pandoc)",
      required: false,
    },
    {
      name: "libreoffice",
      available: libreOfficeAvailable,
      description: "PPTX fallback conversion (brew install --cask libreoffice)",
      required: false,
    },
    {
      name: "unzip",
      available: unzipAvailable,
      description: "EPUB extraction (required for EPUB support)",
      required: false,
    },
    {
      name: "whisper-cpp",
      available: whisperCppReady,
      description: "Audio/video transcription (local, private, optional)",
      required: false,
      note: whisperCppInstalled && !whisperCppModel
        ? "installed but no model found — run: whisper-cpp --download-model base.en (models are intentionally not bundled)"
        : undefined,
    },
    {
      name: "whisper",
      available: whisperPyInstalled,
      description: "Audio/video transcription fallback (pip install openai-whisper)",
      required: false,
    },
    {
      name: "ffmpeg",
      available: ffmpegAvailable,
      description: "Video/audio extraction for media workflows",
      required: false,
    },
    {
      name: "OPENROUTER_API_KEY",
      available: openRouterApiKey !== null,
      description: "Opt-in remote fallback for audio/video and images",
      required: false,
      note: openRouterApiKey
        ? "set — enables remote fallbacks without changing the default local-first behavior"
        : "not set — optional remote enhancement; core workflows work without it",
    },
  ];
}

export function buildDoctorReport(capabilities = buildCapabilities()): string {
  const lines = [
    "mda doctor",
    "",
    "Lightweight default:",
    "  md-anything is useful with zero extra installs.",
    "  No models are bundled, and remote AI fallbacks are opt-in.",
    "",
    "Core capabilities (zero extra installs):",
    "  ✅ text/markdown/json/html  — strong support",
    "  ✅ url                      — strong support (fetch-based)",
    "  ✅ youtube                  — best-effort (transcript-first)",
    "  ✅ image                    — best-effort (metadata only unless upgraded)",
    "  ✅ pdf                      — strong support (unpdf + optional pdftotext)",
    "  ✅ epub                     — best-effort (unzip-based extraction)",
    "  ✅ docx                     — strong support (mammoth, zero-dep)",
    "  ✅ code/source files        — strong support (50+ languages → fenced blocks)",
    "  ✅ pptx                     — best-effort (requires pandoc or libreoffice)",
    "",
    "Optional local upgrades (private/offline, adds setup weight):",
  ];

  for (const cap of capabilities) {
    if (cap.name === "OPENROUTER_API_KEY") continue;
    const icon = cap.available ? "✅" : "❌";
    const req = cap.required ? " (REQUIRED)" : " (optional)";
    lines.push(`  ${icon} ${cap.name.padEnd(20)} — ${cap.description}${req}`);
    if (cap.note) lines.push(`     ⚠️  ${cap.note}`);
  }

  lines.push("");
  const remote = capabilities.find((cap) => cap.name === "OPENROUTER_API_KEY");
  if (remote) {
    lines.push("Optional remote enhancement (opt-in):");
    const icon = remote.available ? "✅" : "❌";
    lines.push(`  ${icon} ${remote.name.padEnd(20)} — ${remote.description} (optional)`);
    if (remote.note) lines.push(`     ⚠️  ${remote.note}`);
    lines.push("");
  }

  lines.push("Suggested modes:");
  lines.push("  - Lightweight mode: install nothing extra");
  lines.push("  - Local privacy mode: add tesseract / pdftotext / whisper-cpp / ffmpeg as needed");
  lines.push("  - Remote convenience mode: set OPENROUTER_API_KEY for opt-in fallbacks");

  return lines.join("\n");
}

export function buildDoctorMarkdown(caps: RuntimeCapabilities = detectCapabilities()): string {
  const lines = [
    "## md-anything capabilities",
    "",
    "### Core (always available)",
    "- ✅ text, markdown, json, html — strong",
    "- ✅ url — strong (fetch-based)",
    "- ✅ youtube — best-effort (transcript-first)",
    "- ✅ image — best-effort (metadata + optional OCR)",
    "- ✅ pdf — strong (unpdf zero-dep + pdftotext fallback)",
    "- ✅ epub — best-effort (unzip-based extraction)",
    "- ✅ mobi — best-effort (requires ebook-convert)",
    "- ✅ docx — strong (mammoth, zero additional dependencies)",
    "- ✅ code/source files — strong (50+ languages, fenced markdown output)",
    `${caps.hasPandoc || caps.hasLibreOffice ? "✅" : "❌"} pptx — best-effort (pandoc: ${caps.hasPandoc ? "✅" : "❌"}, libreoffice: ${caps.hasLibreOffice ? "✅" : "❌"})`,
    "",
    "### Optional tools",
    `${caps.hasTesseract ? "✅" : "❌"} tesseract — OCR for images`,
    `${caps.hasPdftotext ? "✅" : "❌"} pdftotext — PDF text extraction`,
    `${caps.hasUnzip ? "✅" : "❌"} unzip — EPUB extraction`,
    `${caps.hasEbookConvert ? "✅" : "❌"} ebook-convert — MOBI/ebook conversion`,
    `${caps.hasPandoc ? "✅" : "❌"} pandoc — PPTX conversion (brew install pandoc)`,
    `${caps.hasLibreOffice ? "✅" : "❌"} libreoffice — PPTX fallback (brew install --cask libreoffice)`,
    `${caps.hasFfmpeg ? "✅" : "❌"} ffmpeg — media extraction for transcription`,
    `${caps.hasWhisper ? "✅" : "❌"} whisper — audio/video transcription`,
  ];

  return lines.join("\n");
}

export function runDoctor(): void {
  console.log(`\n${buildDoctorReport()}\n`);
}
