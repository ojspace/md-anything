import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

interface Capability {
  name: string;
  available: boolean;
  description: string;
  required: boolean;
  note?: string;
}

function checkBinary(bin: string): boolean {
  try {
    execSync(`which ${bin}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function findWhisperCppModel(): string | null {
  const home = homedir();
  const candidates = [
    "/opt/homebrew/share/whisper.cpp/models/ggml-base.en.bin",
    "/opt/homebrew/share/whisper.cpp/models/ggml-base.bin",
    "/opt/homebrew/share/whisper.cpp/models/ggml-small.en.bin",
    "/opt/homebrew/share/whisper.cpp/models/ggml-small.bin",
    "/usr/local/share/whisper.cpp/models/ggml-base.en.bin",
    "/usr/local/share/whisper.cpp/models/ggml-base.bin",
    `${home}/.cache/whisper-cpp/ggml-base.en.bin`,
    `${home}/.cache/whisper-cpp/ggml-base.bin`,
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return null;
}

export function runDoctor(): void {
  const whisperCppInstalled = checkBinary("whisper-cpp");
  const whisperCppModel = findWhisperCppModel();
  const whisperCppReady = whisperCppInstalled && whisperCppModel !== null;
  const whisperPyInstalled = checkBinary("whisper");
  const ffmpegAvailable = checkBinary("ffmpeg");
  const tesseractAvailable = checkBinary("tesseract");
  const pdftotextAvailable = checkBinary("pdftotext");
  const ebookConvertAvailable = checkBinary("ebook-convert");
  const unzipAvailable = checkBinary("unzip");
  const openRouterApiKey = process.env.OPENROUTER_API_KEY ?? null;

  const capabilities: Capability[] = [
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

  console.log("\nmda doctor\n");
  console.log("Lightweight default:");
  console.log("  md-anything is useful with zero extra installs.");
  console.log("  No models are bundled, and remote AI fallbacks are opt-in.");
  console.log("");
  console.log("Core capabilities (zero extra installs):");
  console.log("  ✅ text/markdown/json/html  — strong support");
  console.log("  ✅ url                      — strong support (fetch-based)");
  console.log("  ✅ youtube                  — best-effort (transcript-first)");
  console.log("  ✅ image                    — best-effort (metadata only unless upgraded)");
  console.log("  ✅ pdf                      — strong support (unpdf + optional pdftotext)");
  console.log("  ✅ epub                     — best-effort (native zip-based extraction)");
  console.log("");
  console.log("Optional local upgrades (private/offline, adds setup weight):");

  for (const cap of capabilities) {
    if (cap.name === "OPENROUTER_API_KEY") continue;
    const icon = cap.available ? "✅" : "❌";
    const req = cap.required ? " (REQUIRED)" : " (optional)";
    console.log(`  ${icon} ${cap.name.padEnd(20)} — ${cap.description}${req}`);
    if (cap.note) console.log(`     ⚠️  ${cap.note}`);
  }

  console.log("");
  const remote = capabilities.find((cap) => cap.name === "OPENROUTER_API_KEY");
  if (remote) {
    console.log("Optional remote enhancement (opt-in):");
    const icon = remote.available ? "✅" : "❌";
    console.log(`  ${icon} ${remote.name.padEnd(20)} — ${remote.description} (optional)`);
    if (remote.note) console.log(`     ⚠️  ${remote.note}`);
    console.log("");
  }

  console.log("Suggested modes:");
  console.log("  - Lightweight mode: install nothing extra");
  console.log("  - Local privacy mode: add tesseract / pdftotext / whisper-cpp / ffmpeg as needed");
  console.log("  - Remote convenience mode: set OPENROUTER_API_KEY for opt-in fallbacks");
  console.log("");
}
