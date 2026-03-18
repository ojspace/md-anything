import type { NormalizedDocument } from "../core/types";
import { convertHtmlContent } from "./html";

export async function convertUrl(url: string): Promise<NormalizedDocument> {
  let html = "";
  let fetchStatus = "ok";
  let fetchError: string | undefined;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; md-anything/0.1; +https://github.com/ojspace/md-anything)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (response.ok) {
      html = await response.text();
    } else {
      fetchStatus = "http-error";
      fetchError = `HTTP ${response.status} ${response.statusText}`;
    }
  } catch (err) {
    fetchStatus = "network-error";
    fetchError = String(err);
  }

  if (!html) {
    return {
      title: url,
      source: url,
      sourceType: "url",
      sections: [
        {
          heading: "Fetch Failed",
          content:
            `Could not retrieve content from: ${url}\n\nReason: ${fetchError || "Unknown error"}` +
            "\n\nThis can happen because of network problems, temporary site issues, or bot protection. Try again later, or save the page as HTML and convert the file locally.",
        },
      ],
      metadata: {
        extraction: "url-fetch",
        extraction_status: "error",
        fetch_status: fetchStatus,
        fetch_error: fetchError,
        url,
      },
    };
  }

  const doc = await convertHtmlContent(html, url);

  return {
    ...doc,
    sourceType: "url",
    metadata: {
      ...doc.metadata,
      fetch_status: fetchStatus,
      url,
    },
  };
}
