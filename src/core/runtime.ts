import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import type { AppConfig } from "../config/defaults";

export interface RuntimeCapabilities {
  hasTesseract: boolean;
  hasPdftotext: boolean;
  hasEbookConvert: boolean;
  hasWhisper: boolean;
  whisperBackend: "whisper-cpp" | "whisper" | null;
  whisperCppModelPath: string | null;
  hasPlaywright: boolean;
  openRouterApiKey: string | null;
}

export interface RuntimeProviders {
  capabilities: RuntimeCapabilities;
  config: AppConfig;
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
    // Homebrew Apple Silicon
    "/opt/homebrew/share/whisper.cpp/models/ggml-base.en.bin",
    "/opt/homebrew/share/whisper.cpp/models/ggml-base.bin",
    "/opt/homebrew/share/whisper.cpp/models/ggml-small.en.bin",
    "/opt/homebrew/share/whisper.cpp/models/ggml-small.bin",
    // Homebrew Intel
    "/usr/local/share/whisper.cpp/models/ggml-base.en.bin",
    "/usr/local/share/whisper.cpp/models/ggml-base.bin",
    "/usr/local/share/whisper.cpp/models/ggml-small.en.bin",
    "/usr/local/share/whisper.cpp/models/ggml-small.bin",
    // User home cache
    `${home}/.cache/whisper-cpp/ggml-base.en.bin`,
    `${home}/.cache/whisper-cpp/ggml-base.bin`,
    `${home}/.cache/whisper/ggml-base.en.bin`,
    `${home}/.cache/whisper/ggml-base.bin`,
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return null;
}

function detectWhisperBackend(): { backend: "whisper-cpp" | "whisper" | null; modelPath: string | null } {
  if (checkBinary("whisper-cpp")) {
    const model = findWhisperCppModel();
    if (model) return { backend: "whisper-cpp", modelPath: model };
  }
  if (checkBinary("whisper")) return { backend: "whisper", modelPath: null };
  return { backend: null, modelPath: null };
}

export function detectCapabilities(): RuntimeCapabilities {
  const { backend, modelPath } = detectWhisperBackend();
  return {
    hasTesseract: checkBinary("tesseract"),
    hasPdftotext: checkBinary("pdftotext"),
    hasEbookConvert: checkBinary("ebook-convert"),
    hasWhisper: backend !== null,
    whisperBackend: backend,
    whisperCppModelPath: modelPath,
    hasPlaywright: (() => {
      try {
        require.resolve("playwright");
        return true;
      } catch {
        return false;
      }
    })(),
    openRouterApiKey: process.env.OPENROUTER_API_KEY ?? null,
  };
}

export function createRuntimeProviders(config: AppConfig): RuntimeProviders {
  return {
    capabilities: detectCapabilities(),
    config,
  };
}
