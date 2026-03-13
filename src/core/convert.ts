import { ConvertRequestSchema } from "../schemas/convert";
import type { ConvertRequest } from "./types";
import { detectInputKind } from "./detect-input";
import { routeInput } from "./route-input";
import { finalizeDocument } from "./finalize-document";
import { formatMarkdown } from "../formatters/markdown";
import type { ConvertResult } from "./types";
import type { RuntimeProviders } from "./runtime";
import { INPUT_SUPPORT_LEVELS } from "./support-levels";

export async function convertToMarkdown(
  rawRequest: ConvertRequest,
  runtime: RuntimeProviders,
): Promise<ConvertResult> {
  const request = ConvertRequestSchema.parse(rawRequest);
  const kind = detectInputKind(request.input);

  const normalized = finalizeDocument(
    await routeInput(kind, request.input, request.options, runtime),
  );

  const markdown = formatMarkdown(normalized, {
    frontmatter: request.options.frontmatter,
  });

  return {
    input: request.input,
    kind,
    markdown,
    metadata: {
      ...normalized.metadata,
      support_level: INPUT_SUPPORT_LEVELS[kind],
    },
  };
}
