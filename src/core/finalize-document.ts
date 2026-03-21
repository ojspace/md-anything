import type { NormalizedDocument } from "./types";
import { attachDocumentProvenance } from "./provenance";
import { evaluateDocumentUsefulness } from "./usefulness";

export function finalizeDocument(doc: NormalizedDocument): NormalizedDocument {
  const usefulness = evaluateDocumentUsefulness(doc);

  if (usefulness.useful) {
    return attachDocumentProvenance({
      ...doc,
      metadata: {
        ...doc.metadata,
        usefulness_score: usefulness.score,
        usefulness_reasons: usefulness.reasons,
      },
    });
  }

  return attachDocumentProvenance({
    ...doc,
    sections: [
      ...doc.sections,
      {
        heading: "Extraction Notes",
        content:
          "This output may be incomplete or low quality. If this input depends on optional local tools (OCR, pdftotext, ebook-convert, whisper), run `mda doctor` to see what is available and improve the result.",
      },
    ],
    metadata: {
      ...doc.metadata,
      usefulness_score: usefulness.score,
      usefulness_reasons: usefulness.reasons,
      low_confidence_output: true,
    },
  });
}
