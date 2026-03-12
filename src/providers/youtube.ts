import type { NormalizedDocument } from "../core/types";

function extractVideoId(url: string): string | null {
  // YouTube video IDs are always exactly 11 alphanumeric/dash/underscore chars.
  // The negative lookahead prevents matching the first 11 chars of a longer string.
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})(?![a-zA-Z0-9_-])/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})(?![a-zA-Z0-9_-])/,
    /shorts\/([a-zA-Z0-9_-]{11})(?![a-zA-Z0-9_-])/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export type TranscriptStatus = "captions" | "unavailable" | "error" | "disabled";

export interface TranscriptResult {
  text: string;
  status: TranscriptStatus;
  language?: string;
}

export interface YouTubeTranscriptBackend {
  fetch(videoId: string): Promise<TranscriptResult>;
}

class DefaultYouTubeBackend implements YouTubeTranscriptBackend {
  async fetch(videoId: string): Promise<TranscriptResult> {
    try {
      const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; md-anything/0.1)",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!pageRes.ok) {
        return { text: "", status: "error" };
      }

      const pageHtml = await pageRes.text();

      const captionMatch = pageHtml.match(/"captionTracks":\s*(\[.*?\])/);
      if (!captionMatch) {
        return { text: "", status: "unavailable" };
      }

      let tracks: Array<{ baseUrl: string; languageCode: string; name?: { simpleText?: string } }> = [];
      try {
        tracks = JSON.parse(captionMatch[1]);
      } catch {
        return { text: "", status: "error" };
      }

      if (tracks.length === 0) {
        return { text: "", status: "unavailable" };
      }

      const track =
        tracks.find((t) => t.languageCode === "en") ||
        tracks.find((t) => t.languageCode?.startsWith("en")) ||
        tracks[0];

      if (!track?.baseUrl) {
        return { text: "", status: "unavailable" };
      }

      const transcriptRes = await fetch(track.baseUrl, {
        signal: AbortSignal.timeout(15000),
      });

      if (!transcriptRes.ok) {
        return { text: "", status: "error" };
      }

      const xml = await transcriptRes.text();

      const textParts = [];
      const textRe = /<text[^>]*>([\s\S]*?)<\/text>/g;
      let m: RegExpExecArray | null;
      while ((m = textRe.exec(xml)) !== null) {
        // YouTube timedtext content is plain text with XML entities — decode entities only
        const xmlEntities: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
        const decoded = m[1]
          .replace(/&([a-zA-Z]+|#\d+|#x[\da-fA-F]+);/g, (match, ref: string) => {
            if (ref.startsWith("#x")) return String.fromCharCode(parseInt(ref.slice(2), 16));
            if (ref.startsWith("#")) return String.fromCharCode(parseInt(ref.slice(1), 10));
            return xmlEntities[ref.toLowerCase()] ?? match;
          })
          .trim();
        if (decoded) textParts.push(decoded);
      }

      if (textParts.length === 0) {
        return { text: "", status: "unavailable" };
      }

      return {
        text: textParts.join(" "),
        status: "captions",
        language: track.languageCode,
      };
    } catch {
      return { text: "", status: "error" };
    }
  }
}

const defaultBackend = new DefaultYouTubeBackend();

export async function convertYoutube(
  url: string,
  backend: YouTubeTranscriptBackend = defaultBackend,
): Promise<NormalizedDocument> {
  const videoId = extractVideoId(url);

  if (!videoId) {
    return {
      title: url,
      source: url,
      sourceType: "youtube",
      sections: [
        {
          heading: "YouTube Video",
          content: `Could not parse video ID from URL: ${url}`,
        },
      ],
      metadata: {
        extraction: "youtube-transcript",
        extraction_status: "error",
        error: "invalid-url",
        url,
      },
    };
  }

  const result = await backend.fetch(videoId);

  const sections = [];
  if (result.text && result.text.length > 10) {
    sections.push({
      heading: "Transcript",
      content: result.text,
    });
  } else {
    const reason =
      result.status === "unavailable"
        ? "Captions are not available for this video."
        : result.status === "disabled"
        ? "Captions are disabled for this video."
        : "Could not retrieve transcript.";
    sections.push({
      heading: "YouTube Video",
      content: `*Video ID: ${videoId}*\n\n${reason}\n\nYouTube URL: ${url}`,
    });
  }

  return {
    title: `YouTube: ${videoId}`,
    source: url,
    sourceType: "youtube",
    sections,
    metadata: {
      extraction: "youtube-transcript",
      extraction_status: result.status === "captions" ? "ok" : result.status,
      video_id: videoId,
      transcript_status: result.status,
      transcript_language: result.language,
      url,
    },
  };
}
