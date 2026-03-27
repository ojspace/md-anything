import type { InputKind, NormalizedDocument, ConvertOptions } from "./types";
import type { RuntimeProviders } from "./runtime";
import { convertText, convertMarkdown, convertJson } from "../providers/text";
import { convertHtml } from "../providers/html";
import { convertUrl } from "../providers/url";
import { convertImage } from "../providers/image";
import { convertPdf } from "../providers/pdf";
import { convertEpub } from "../providers/epub";
import { convertMobi } from "../providers/mobi";
import { convertYoutube } from "../providers/youtube";
import { convertAudio } from "../providers/audio";
import { convertVideo } from "../providers/video";
import { convertCode } from "../providers/code";
import { convertDocx } from "../providers/docx";
import { convertPptx } from "../providers/pptx";

export async function routeInput(
  kind: InputKind,
  input: string,
  options: ConvertOptions,
  runtime: RuntimeProviders,
): Promise<NormalizedDocument> {
  const caps = runtime.capabilities;

  switch (kind) {
    case "text":
      return convertText(input);
    case "markdown":
      return convertMarkdown(input);
    case "json":
      return convertJson(input);
    case "html":
      return convertHtml(input);
    case "url":
      return convertUrl(input);
    case "youtube":
      return convertYoutube(input);
    case "image":
      return convertImage(input, caps.hasTesseract, caps.openRouterApiKey);
    case "pdf":
      return convertPdf(input, caps.hasPdftotext, caps.hasTesseract);
    case "epub":
      return convertEpub(input);
    case "mobi":
      return convertMobi(input, caps.hasEbookConvert);
    case "audio":
      return convertAudio(
        input,
        caps.whisperBackend,
        caps.whisperCppModelPath,
        caps.hasFfmpeg,
        caps.openRouterApiKey,
      );
    case "video":
      return convertVideo(
        input,
        caps.whisperBackend,
        caps.whisperCppModelPath,
        caps.hasFfmpeg,
        caps.openRouterApiKey,
      );
    case "code":
      return convertCode(input);
    case "docx":
      return convertDocx(input);
    case "pptx":
      return convertPptx(input, caps.hasPandoc, caps.hasLibreOffice);
    default:
      return {
        title: input,
        source: input,
        sourceType: kind,
        sections: [
          {
            content: `Unsupported input type: ${kind}\n\nInput: ${input}`,
          },
        ],
        metadata: {
          extraction: "unsupported",
          extraction_status: "weak",
          kind,
        },
      };
  }
}
