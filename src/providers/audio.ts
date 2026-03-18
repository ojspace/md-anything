import { stat } from "node:fs/promises";
import { basename, extname } from "node:path";
import { execSync } from "node:child_process";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { NormalizedDocument } from "../core/types";

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

  if (!whisperBackend) {
    return {
      title: name,
      source: filePath,
      sourceType: "audio",
      sections: [
        {
          heading: "Audio File",
          content:
            `*File: ${name}*\n\nAudio transcription requires whisper.cpp.\n\n` +
            "Install with: `brew install whisper-cpp`\n\n" +
            "Then download a model: `whisper-cpp --download-model base.en`\n\n" +
            "Or use the Python fallback: `pip install openai-whisper`\n\n" +
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

  const transcript =
    whisperBackend === "whisper-cpp" && whisperCppModelPath
      ? await runWhisperCpp(filePath, whisperCppModelPath)
      : await runWhisper(filePath);

  if (transcript && transcript.length > 10) {
    return {
      title: name,
      source: filePath,
      sourceType: "audio",
      sections: [{ heading: "Transcript", content: transcript }],
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

  return {
    title: name,
    source: filePath,
    sourceType: "audio",
    sections: [
      {
        heading: "Audio File",
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
