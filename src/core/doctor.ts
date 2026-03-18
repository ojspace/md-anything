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

  const capabilities: Capability[] = [
    {
      name: "tesseract",
      available: checkBinary("tesseract"),
      description: "OCR for image text extraction",
      required: false,
    },
    {
      name: "pdftotext",
      available: checkBinary("pdftotext"),
      description: "PDF text extraction (poppler-utils)",
      required: false,
    },
    {
      name: "ebook-convert",
      available: checkBinary("ebook-convert"),
      description: "MOBI/ebook conversion (Calibre)",
      required: false,
    },
    {
      name: "unzip",
      available: checkBinary("unzip"),
      description: "EPUB extraction (required for EPUB support)",
      required: false,
    },
    {
      name: "whisper-cpp",
      available: whisperCppReady,
      description: "Audio/video transcription (brew install whisper-cpp)",
      required: false,
      note: whisperCppInstalled && !whisperCppModel
        ? "installed but no model found — run: whisper-cpp --download-model base.en"
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
      available: checkBinary("ffmpeg"),
      description: "Video/audio extraction for media workflows",
      required: false,
    },
  ];

  console.log("\nmda doctor\n");
  console.log("Core capabilities (always available):");
  console.log("  ✅ text/markdown/json/html  — strong support");
  console.log("  ✅ url                      — strong support (fetch-based)");
  console.log("  ✅ youtube                  — best-effort (transcript-first)");
  console.log("  ✅ image                    — best-effort (metadata + optional OCR)");
  console.log("  ✅ pdf                      — strong support (unpdf + optional pdftotext)");
  console.log("  ✅ epub                     — best-effort (native zip-based extraction)");
  console.log("  ✅ mobi                     — best-effort (requires ebook-convert)");
  console.log("");
  console.log("Optional tools:");

  for (const cap of capabilities) {
    const icon = cap.available ? "✅" : "❌";
    const req = cap.required ? " (REQUIRED)" : " (optional)";
    console.log(`  ${icon} ${cap.name.padEnd(20)} — ${cap.description}${req}`);
    if (cap.note) console.log(`     ⚠️  ${cap.note}`);
  }

  console.log("");
  const allRequired = capabilities.filter((c) => c.required && !c.available);
  if (allRequired.length === 0) {
    console.log("✅ All required capabilities are available.\n");
  } else {
    console.log(`❌ Missing required: ${allRequired.map((c) => c.name).join(", ")}\n`);
  }
}
