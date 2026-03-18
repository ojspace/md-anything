import { readFile } from "node:fs/promises";
import { stat } from "node:fs/promises";

const OPENROUTER_API = "https://openrouter.ai/api/v1/chat/completions";
const HEADERS = {
  "Content-Type": "application/json",
  "HTTP-Referer": "https://github.com/ojspace/md-anything",
  "X-Title": "md-anything",
};

// Max file size to send via API (25 MB base64-encoded ≈ ~33 MB on wire)
const MAX_FILE_BYTES = 25 * 1024 * 1024;

async function post(apiKey: string, body: object): Promise<string | null> {
  try {
    const res = await fetch(OPENROUTER_API, {
      method: "POST",
      headers: { ...HEADERS, Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return json.choices?.[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}

/** Describe/OCR an image using Nemotron Nano 12B 2 VL (free). */
export async function describeImageWithVL(apiKey: string, filePath: string): Promise<string | null> {
  let fileBytes: number;
  try {
    fileBytes = (await stat(filePath)).size;
  } catch {
    return null;
  }
  if (fileBytes > MAX_FILE_BYTES) return null;

  const ext = filePath.split(".").pop()?.toLowerCase() ?? "jpeg";
  const mimeMap: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
  };
  const mime = mimeMap[ext] ?? "image/jpeg";
  const data = (await readFile(filePath)).toString("base64");

  return post(apiKey, {
    model: "nvidia/nemotron-nano-12b-v2-vl:free",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Describe all content in this image thoroughly. If there is text, transcribe it exactly. If there are charts, tables, or diagrams, describe their structure and content in detail. Format your response as plain markdown.",
          },
          {
            type: "image_url",
            image_url: { url: `data:${mime};base64,${data}` },
          },
        ],
      },
    ],
  });
}

/** Transcribe audio using Healer Alpha (free, native audio input). */
export async function transcribeAudioWithHealer(apiKey: string, filePath: string): Promise<string | null> {
  let fileBytes: number;
  try {
    fileBytes = (await stat(filePath)).size;
  } catch {
    return null;
  }
  if (fileBytes > MAX_FILE_BYTES) return null;

  const ext = filePath.split(".").pop()?.toLowerCase() ?? "wav";
  const supportedFormats = ["wav", "mp3", "mp4", "m4a", "ogg", "flac", "webm"];
  const format = supportedFormats.includes(ext) ? ext : "wav";

  const data = (await readFile(filePath)).toString("base64");

  return post(apiKey, {
    model: "openrouter/healer-alpha",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Transcribe all speech in this audio. Return only the transcription text, with no commentary or timestamps unless they appear in the source.",
          },
          {
            type: "input_audio",
            input_audio: { data, format },
          },
        ],
      },
    ],
  });
}
