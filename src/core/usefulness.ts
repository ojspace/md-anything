import type { NormalizedDocument } from "./types";

export interface UsefulnessResult {
  useful: boolean;
  score: number;
  reasons: string[];
}

export function evaluateDocumentUsefulness(doc: NormalizedDocument): UsefulnessResult {
  const reasons: string[] = [];
  let score = 1.0;

  const totalContent = doc.sections.reduce((acc, s) => acc + (s.content?.length ?? 0), 0);
  
  if (totalContent < 50) {
    score -= 0.5;
    reasons.push("Very short content (< 50 chars)");
  } else if (totalContent < 200) {
    score -= 0.2;
    reasons.push("Short content (< 200 chars)");
  }

  const status = doc.metadata?.extraction_status;
  if (status === "weak" || status === "error") {
    score -= 0.3;
    reasons.push(`Extraction status: ${status}`);
  }

  if (doc.metadata?.low_confidence_output) {
    score -= 0.2;
    reasons.push("Marked as low-confidence output");
  }

  if (doc.sections.length === 0) {
    score = 0;
    reasons.push("No sections extracted");
  }

  score = Math.max(0, Math.min(1, score));
  
  return {
    useful: score >= 0.5,
    score,
    reasons,
  };
}
