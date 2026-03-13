import { stat } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { execSync } from "node:child_process";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import type { NormalizedDocument } from "../core/types";

function hasFfmpeg(): boolean {
  try {
    execSync("which ffmpeg", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

async function extractAudioAndTranscribe(filePath: string): Promise<string | null> {
  const tmpDir = await mkdtemp(join(tmpdir(), "md-anything-video-"));
  const audioPath = join(tmpDir, "audio.mp3");

  try {
    execSync(`ffmpeg -i "${filePath}" -q:a 0 -map a "${audioPath}" -y 2>/dev/null`, {
      timeout: 120000,
    });

    execSync(`whisper "${audioPath}" --output_dir "${tmpDir}" --output_format txt 2>/dev/null`, {
      timeout: 300000,
    });

    const files = await readdir(tmpDir);
    const txtFile = files.find((f) => f.endsWith(".txt") && f !== "audio.txt");
    const fallback = files.find((f) => f.endsWith(".txt"));
    const target = txtFile ?? fallback;
    if (!target) return null;

    const text = await readFile(join(tmpDir, target), "utf-8");
    return text.trim() || null;
  } catch {
    return null;
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

export async function convertVideo(filePath: string, hasWhisper = false): Promise<NormalizedDocument> {
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

  if (!hasWhisper || !ffmpegAvailable) {
    const missing = [];
    if (!hasWhisper) missing.push("`pip install openai-whisper`");
    if (!ffmpegAvailable) missing.push("`brew install ffmpeg`");

    return {
      title: name,
      source: filePath,
      sourceType: "video",
      sections: [
        {
          heading: "Video File",
          content: `*File: ${name}*\n\nVideo transcription requires Whisper and ffmpeg.\n\nInstall: ${missing.join(", ")}`,
        },
      ],
      metadata: {
        extraction: "unavailable",
        extraction_status: "weak",
        file_name: name,
        file_size_bytes: fileSize,
        format: ext,
        whisper_available: hasWhisper,
        ffmpeg_available: ffmpegAvailable,
        low_confidence_output: true,
      },
    };
  }

  const transcript = await extractAudioAndTranscribe(filePath);

  if (transcript && transcript.length > 10) {
    return {
      title: name,
      source: filePath,
      sourceType: "video",
      sections: [{ heading: "Transcript", content: transcript }],
      metadata: {
        extraction: "whisper",
        extraction_status: "ok",
        file_name: name,
        file_size_bytes: fileSize,
        format: ext,
        whisper_available: true,
        ffmpeg_available: true,
        transcript_length: transcript.length,
      },
    };
  }

  return {
    title: name,
    source: filePath,
    sourceType: "video",
    sections: [
      {
        heading: "Video File",
        content: `*File: ${name}*\n\nWhisper ran but produced no transcript. The video may have no audio track, or the audio may be in an unsupported language.`,
      },
    ],
    metadata: {
      extraction: "whisper-empty",
      extraction_status: "weak",
      file_name: name,
      file_size_bytes: fileSize,
      format: ext,
      whisper_available: true,
      ffmpeg_available: true,
    },
  };
}
