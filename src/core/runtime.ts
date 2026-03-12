import { execSync } from "node:child_process";
import type { AppConfig } from "../config/defaults";

export interface RuntimeCapabilities {
  hasTesseract: boolean;
  hasPdftotext: boolean;
  hasEbookConvert: boolean;
  hasWhisper: boolean;
  hasPlaywright: boolean;
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

export function detectCapabilities(): RuntimeCapabilities {
  return {
    hasTesseract: checkBinary("tesseract"),
    hasPdftotext: checkBinary("pdftotext"),
    hasEbookConvert: checkBinary("ebook-convert"),
    hasWhisper: checkBinary("whisper"),
    hasPlaywright: (() => {
      try {
        // require.resolve works in Bun for checking if a package is installed
        // without actually importing it. Returns false if not found.
        require.resolve("playwright");
        return true;
      } catch {
        return false;
      }
    })(),
  };
}

export function createRuntimeProviders(config: AppConfig): RuntimeProviders {
  return {
    capabilities: detectCapabilities(),
    config,
  };
}
