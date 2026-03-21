import { stat } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import type { NormalizedDocument } from "../core/types";
import { transcribeAudioWithHealer } from "./openrouter-client";

function hasFfmpeg(): boolean {
  try {
    const result = spawnSync("which", ["ffmpeg"], { stdio: "ignore" });
    return result.status === 0;
  } catch {
    return false;
  }
}

async function extractAudio(filePath: string): Promise<{ audioPath: string; tmpDir: string } | null> {
  const tmpDir = await mkdtemp(join(tmpdir(), "md-anything-video-"));
  const audioPath = join(tmpDir, "audio.wav");
  try {
    const result = spawnSync("ffmpeg", ["-i", filePath, "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", audioPath, "-y"], {
      timeout: 120000,
      stdio: ["ignore", "ignore", "ignore"],
    });
    if (result.error || result.status !== 0) {
      await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      return null;
    }
    return { audioPath, tmpDir };
  } catch {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    return null;
  }
}

async function transcribeWithWhisper(
  audioPath: string,
  tmpDir: string,
  whisperBackend: "whisper-cpp" | "whisper",
  whisperCppModelPath: string | null,
): Promise<string | null> {
  try {
    if (whisperBackend === "whisper-cpp" && whisperCppModelPath) {
      const outPrefix = join(tmpDir, "out");
      const result = spawnSync("whisper-cpp", ["-f", audioPath, "-m", whisperCppModelPath, "-otxt", "-of", outPrefix], {
        timeout: 300000,
        stdio: ["ignore", "ignore", "ignore"],
      });
      if (result.error || result.status !== 0) return null;
      const text = await readFile(`${outPrefix}.txt`, "utf-8");
      return text.trim() || null;
    } else {
      const result = spawnSync("whisper", [audioPath, "--output_dir", tmpDir, "--output_format", "txt"], {
        timeout: 300000,
        stdio: ["ignore", "ignore", "ignore"],
      });
      if (result.error || result.status !== 0) return null;
      const files = await readdir(tmpDir);
      const txtFile = files.find((f) => f.endsWith(".txt"));
      if (!txtFile) return null;
      const text = await readFile(join(tmpDir, txtFile), "utf-8");
      return text.trim() || null;
    }
  } catch {
    return null;
  }
}

export async function convertVideo(
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

  const ffmpegAvailable = hasFfmpeg();

  // Prefer local whisper (private, offline, no API key needed)
  if (whisperBackend && ffmpegAvailable) {
    const extracted = await extractAudio(filePath);
    if (extracted) {
      const { audioPath, tmpDir } = extracted;
      try {
        const transcript = await transcribeWithWhisper(audioPath, tmpDir, whisperBackend, whisperCppModelPath);
        if (transcript && transcript.length > 10) {
          return {
            title: name,
            source: filePath,
            sourceType: "video",
            sections: [{ heading: "Transcript", kind: "transcript", content: transcript }],
            metadata: {
              extraction: "whisper",
              extraction_status: "ok",
              file_name: name,
              file_size_bytes: fileSize,
              format: ext,
              whisper_available: true,
              whisper_backend: whisperBackend,
              ffmpeg_available: true,
              transcript_length: transcript.length,
            },
          };
        }
      } finally {
        await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      }
    }
  }

  // Fallback: OpenRouter Healer Alpha (free, native audio/video understanding)
  if (openRouterApiKey && ffmpegAvailable) {
    const extracted = await extractAudio(filePath);
    if (extracted) {
      const { audioPath, tmpDir } = extracted;
      try {
        const transcript = await transcribeAudioWithHealer(openRouterApiKey, audioPath);
        if (transcript && transcript.length > 10) {
          return {
            title: name,
            source: filePath,
            sourceType: "video",
            sections: [{ heading: "Transcript", kind: "transcript", content: transcript }],
            metadata: {
              extraction: "openrouter-healer",
              extraction_status: "ok",
              file_name: name,
              file_size_bytes: fileSize,
              format: ext,
              model: "openrouter/healer-alpha",
              ffmpeg_available: true,
              transcript_length: transcript.length,
            },
          };
        }
      } finally {
        await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      }
    }
  }

  if (whisperBackend && ffmpegAvailable) {
    // Tools available but produced no output
    return {
      title: name,
      source: filePath,
      sourceType: "video",
      sections: [
        {
          heading: "Video File",
          kind: "fallback",
          content:
            `*File: ${name}*\n\nWhisper ran but produced no transcript. ` +
            "The video may have no audio track, very low-quality audio, or unsupported speech.",
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
        ffmpeg_available: true,
      },
    };
  }

  const missing = [];
  if (!whisperBackend) missing.push("`brew install whisper-cpp` then `whisper-cpp --download-model base.en`");
  if (!ffmpegAvailable) missing.push("`brew install ffmpeg`");
  const apiNote = !openRouterApiKey
    ? "\n\n**Alternative (free API):** Set `OPENROUTER_API_KEY` — uses Healer Alpha, no local install needed (still requires ffmpeg)"
    : "";

  return {
    title: name,
    source: filePath,
    sourceType: "video",
    sections: [
      {
        heading: "Video File",
        kind: "fallback",
        content:
          `*File: ${name}*\n\nVideo transcription requires Whisper and ffmpeg.\n\n` +
          `**Install:** ${missing.join(", ")}${apiNote}\n\n` +
          "Then run `mda doctor` to confirm the transcription tools are available.",
      },
    ],
    metadata: {
      extraction: "unavailable",
      extraction_status: "weak",
      file_name: name,
      file_size_bytes: fileSize,
      format: ext,
      whisper_available: whisperBackend !== null,
      ffmpeg_available: ffmpegAvailable,
      low_confidence_output: true,
    },
  };
}
