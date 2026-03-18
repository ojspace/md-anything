import { stat } from "node:fs/promises";
import { basename, extname } from "node:path";
import { execSync } from "node:child_process";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { NormalizedDocument } from "../core/types";
import { transcribeAudioWithHealer } from "./openrouter-client";

async function runWhisperCpp(filePath: string, modelPath: string): Promise<string | null> {
  const tmpDir = await mkdtemp(join(tmpdir(), "md-anything-audio-"));
  const outPrefix = join(tmpDir, "out");
  try {
    execSync(`whisper-cpp -f "${filePath}" -m "${modelPath}" -otxt -of "${outPrefix}" 2>/dev/null`, {
      timeout: 300000,
    });
    const text = await readFile(`${outPrefix}.txt`, "utf-8");
    return text.trim() || null;
  } catch {
    return null;
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function runWhisper(filePath: string): Promise<string | null> {
  const tmpDir = await mkdtemp(join(tmpdir(), "md-anything-audio-"));
  try {
    execSync(`whisper "${filePath}" --output_dir "${tmpDir}" --output_format txt 2>/dev/null`, {
      timeout: 300000,
    });

    const files = await readdir(tmpDir);
    const txtFile = files.find((f) => f.endsWith(".txt"));
    if (!txtFile) return null;

    const text = await readFile(join(tmpDir, txtFile), "utf-8");
    return text.trim() || null;
  } catch {
    return null;
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

export async function convertAudio(
  filePath: string,
  whisperBackend: "whisper-cpp" | "whisper" | null,
  whisperCppModelPath: string | null,
  openRouterApiKey: string | null = null,
): Promise<NormalizedDocument> {
  const name = basename(filePath);
  const ext = extname(filePath).toLowerCase().slice(1);
  let fileSize = 0;

  try {
    const s = await stat(filePath);
    fileSize = s.size;
  } catch {
    // ignore
  }

  // Prefer local whisper (private, offline, no API key needed)
  if (whisperBackend) {
    const transcript =
      whisperBackend === "whisper-cpp" && whisperCppModelPath
        ? await runWhisperCpp(filePath, whisperCppModelPath)
        : await runWhisper(filePath);

    if (transcript && transcript.length > 10) {
      return {
        title: name,
        source: filePath,
        sourceType: "audio",
        sections: [{ heading: "Transcript", kind: "transcript", content: transcript }],
        metadata: {
          extraction: "whisper",
          extraction_status: "ok",
          file_name: name,
          file_size_bytes: fileSize,
          format: ext,
          whisper_available: true,
          whisper_backend: whisperBackend,
          transcript_length: transcript.length,
        },
      };
    }
  }

  // Fallback: OpenRouter Healer Alpha (free, native audio understanding)
  if (openRouterApiKey) {
    const transcript = await transcribeAudioWithHealer(openRouterApiKey, filePath);
    if (transcript && transcript.length > 10) {
      return {
        title: name,
        source: filePath,
        sourceType: "audio",
        sections: [{ heading: "Transcript", content: transcript }],
        metadata: {
          extraction: "openrouter-healer",
          extraction_status: "ok",
          file_name: name,
          file_size_bytes: fileSize,
          format: ext,
          model: "openrouter/healer-alpha",
          transcript_length: transcript.length,
        },
      };
    }
  }

  if (whisperBackend) {
    // Whisper ran but produced nothing
    return {
      title: name,
      source: filePath,
      sourceType: "audio",
      sections: [
        {
          heading: "Audio File",
          kind: "fallback",
          content:
            `*File: ${name}*\n\nWhisper ran but produced no transcript. ` +
            "The audio may be silent, too noisy, or in an unsupported language.",
        },
      ],
      metadata: {
        extraction: "whisper-empty",
        extraction_status: "weak",
        file_name: name,
        file_size_bytes: fileSize,
        format: ext,
        whisper_available: true,
        whisper_backend: whisperBackend,
      },
    };
  }

  return {
    title: name,
    source: filePath,
    sourceType: "audio",
    sections: [
      {
        heading: "Audio File",
        kind: "fallback",
        content:
          `*File: ${name}*\n\nAudio transcription requires whisper.cpp or an OpenRouter API key.\n\n` +
          "**Option 1 (local, preferred):** `brew install whisper-cpp` then `whisper-cpp --download-model base.en`\n\n" +
          "**Option 2 (free API):** Set `OPENROUTER_API_KEY` — uses Healer Alpha, no install needed\n\n" +
          "Then run `mda doctor` to confirm the tool is available.",
      },
    ],
    metadata: {
      extraction: "unavailable",
      extraction_status: "weak",
      file_name: name,
      file_size_bytes: fileSize,
      format: ext,
      whisper_available: false,
      low_confidence_output: true,
    },
  };
}
