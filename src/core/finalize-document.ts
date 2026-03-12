import type { NormalizedDocument } from "./types";
import { evaluateDocumentUsefulness } from "./usefulness";

export function finalizeDocument(doc: NormalizedDocument): NormalizedDocument {
  const usefulness = evaluateDocumentUsefulness(doc);

  if (usefulness.useful) {
    return {
      ...doc,
      metadata: {
        ...doc.metadata,
        usefulness_score: usefulness.score,
        usefulness_reasons: usefulness.reasons,
      },
    };
  }

  return {
    ...doc,
    sections: [
      ...doc.sections,
      {
        heading: "Extraction Notes",
        content:
          "This output may be incomplete or low quality. Consider enabling optional local tools or a stronger provider for this input type.",
      },
    ],
    metadata: {
      ...doc.metadata,
      usefulness_score: usefulness.score,
      usefulness_reasons: usefulness.reasons,
      low_confidence_output: true,
    },
  };
}
