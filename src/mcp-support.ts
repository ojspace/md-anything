import { isAbsolute, relative, resolve, sep } from "node:path";
import type { ConvertResult, IngestResult } from "./core/types";
import { INPUT_SUPPORT_LEVELS } from "./core/support-levels";

export const MCP_WORKSPACE_RESOURCE_SCHEME = "md-anything://workspace/";
export const MCP_DOCTOR_RESOURCE_URI = "md-anything://doctor";
export const MCP_POLICY_RESOURCE_URI = "md-anything://workspace-policy";

const PRIVATE_IPV4_PATTERNS = [
  /^127\./,
  /^10\./,
  /^0\./,
  /^192\.168\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
];

function normalizeWorkspaceRoot(root: string): string {
  return resolve(root);
}

function normalizeForUri(value: string): string {
  return value.split(sep).join("/");
}

function isWithinWorkspace(workspaceRoot: string, candidatePath: string): boolean {
  const rel = relative(workspaceRoot, candidatePath);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function isPrivateHostName(hostname: string): boolean {
  const normalizedHost = hostname.toLowerCase();

  if (
    normalizedHost === "localhost"
    || normalizedHost.endsWith(".localhost")
    || normalizedHost === "::1"
    || normalizedHost === "[::1]"
    || normalizedHost.endsWith(".local")
  ) {
    return true;
  }

  return PRIVATE_IPV4_PATTERNS.some((pattern) => pattern.test(normalizedHost));
}

export class McpInputError extends Error {
  code: string;
  details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "McpInputError";
    this.code = code;
    this.details = details;
  }
}

export interface ResolvedWorkspacePath {
  resolvedPath: string;
  workspaceRelativePath: string;
}

export function resolveWorkspacePath(inputPath: string, workspaceRoot = process.cwd()): ResolvedWorkspacePath {
  const normalizedRoot = normalizeWorkspaceRoot(workspaceRoot);
  const trimmedInput = inputPath.trim();

  if (!trimmedInput) {
    throw new McpInputError("missing_path", "Path must not be empty.");
  }

  const resolvedPath = resolve(normalizedRoot, trimmedInput);
  if (!isWithinWorkspace(normalizedRoot, resolvedPath)) {
    throw new McpInputError(
      "path_outside_workspace",
      `Path must stay inside the MCP workspace root: ${normalizedRoot}`,
      { workspaceRoot: normalizedRoot, requestedPath: inputPath },
    );
  }

  const rel = relative(normalizedRoot, resolvedPath);
  return {
    resolvedPath,
    workspaceRelativePath: normalizeForUri(rel || "."),
  };
}

export function validateRemoteUrl(input: string, allowPrivateUrls = process.env.MDA_MCP_ALLOW_PRIVATE_URLS === "1"): string {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    throw new McpInputError("invalid_url", `Invalid URL: ${input}`);
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new McpInputError("unsupported_url_scheme", "Only http:// and https:// URLs are allowed.");
  }

  if (parsed.username || parsed.password) {
    throw new McpInputError("credentialed_url_blocked", "URLs with embedded credentials are not allowed.");
  }

  if (!allowPrivateUrls && isPrivateHostName(parsed.hostname)) {
    throw new McpInputError(
      "private_url_blocked",
      "Private, localhost, and link-local URLs are blocked by default for MCP safety. Set MDA_MCP_ALLOW_PRIVATE_URLS=1 to override intentionally.",
      { hostname: parsed.hostname },
    );
  }

  return parsed.toString();
}

export function resolveMcpInput(
  input: string,
  workspaceRoot = process.cwd(),
): { resolvedInput: string; workspaceRelativePath?: string; isUrl: boolean } {
  const trimmedInput = input.trim();
  if (/^https?:\/\//i.test(trimmedInput)) {
    return { resolvedInput: validateRemoteUrl(trimmedInput), isUrl: true };
  }

  const { resolvedPath, workspaceRelativePath } = resolveWorkspacePath(trimmedInput, workspaceRoot);
  return {
    resolvedInput: resolvedPath,
    workspaceRelativePath,
    isUrl: false,
  };
}

export function buildWorkspaceResourceUri(workspaceRelativePath: string): string {
  const normalized = normalizeForUri(workspaceRelativePath)
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${MCP_WORKSPACE_RESOURCE_SCHEME}${normalized}`;
}

export function parseWorkspaceResourceUri(uri: string): string {
  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    throw new McpInputError("invalid_resource_uri", `Invalid resource URI: ${uri}`);
  }

  if (parsed.protocol !== "md-anything:" || parsed.hostname !== "workspace") {
    throw new McpInputError("unsupported_resource_uri", `Unsupported resource URI: ${uri}`);
  }

  const relativePath = parsed.pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment))
    .join("/");

  if (!relativePath) {
    throw new McpInputError("missing_resource_path", "Workspace resource URIs must include a relative path.");
  }

  return relativePath;
}

export function buildWorkspacePolicy(workspaceRoot = process.cwd()): Record<string, unknown> {
  return {
    workspaceRoot: normalizeWorkspaceRoot(workspaceRoot),
    localPaths: "restricted-to-workspace-root",
    remoteUrls: {
      allowedSchemes: ["http", "https"],
      blockPrivateByDefault: process.env.MDA_MCP_ALLOW_PRIVATE_URLS !== "1",
    },
    resources: {
      workspaceTemplate: "md-anything://workspace/{path}",
      doctor: MCP_DOCTOR_RESOURCE_URI,
      workspacePolicy: MCP_POLICY_RESOURCE_URI,
    },
  };
}

export function buildConvertStructuredContent(
  result: ConvertResult,
  workspaceRelativePath?: string,
): Record<string, unknown> {
  return {
    input: result.input,
    kind: result.kind,
    supportLevel: INPUT_SUPPORT_LEVELS[result.kind],
    markdown: result.markdown,
    metadata: result.metadata,
    provenance: result.document.provenance,
    chunks: result.chunks,
    document: {
      title: result.document.title,
      source: result.document.source,
      sourceType: result.document.sourceType,
      summary: result.document.summary,
      sections: result.document.sections,
    },
    ...(workspaceRelativePath ? { workspaceResource: buildWorkspaceResourceUri(workspaceRelativePath) } : {}),
  };
}

export function buildIngestStructuredContent(result: IngestResult): Record<string, unknown> {
  return {
    converted: result.converted,
    skipped: result.skipped,
    failed: result.failed,
    docs: result.docs.map((doc) => ({
      fileName: doc.fileName,
      title: doc.title,
      source: doc.source,
      sourceType: doc.sourceType,
      summary: doc.summary,
      metadata: doc.metadata,
      provenance: doc.provenance,
      chunks: doc.chunks ?? [],
      sectionCount: doc.sections.length,
    })),
  };
}

export function buildToolErrorResult(error: McpInputError | Error): {
  content: Array<{ type: "text"; text: string }>;
  structuredContent: Record<string, unknown>;
  isError: true;
} {
  if (error instanceof McpInputError) {
    return {
      content: [{ type: "text", text: error.message }],
      structuredContent: {
        error: error.message,
        code: error.code,
        ...(error.details ? { details: error.details } : {}),
      },
      isError: true,
    };
  }

  return {
    content: [{ type: "text", text: error.message }],
    structuredContent: {
      error: error.message,
      code: "internal_error",
    },
    isError: true,
  };
}

export function buildAnalysisPrompt(input: string, question?: string): string {
  const lines = [
    `Use the \`convert\` tool on \`${input}\` first.`,
    "Then answer using the returned Markdown, metadata, provenance, and chunks.",
    "Prefer citing chunk ids, heading paths, or page ranges when they help ground the answer.",
  ];

  if (question?.trim()) {
    lines.push("", `Question: ${question.trim()}`);
  } else {
    lines.push("", "Task: summarize the document and call out the most important sections.");
  }

  return lines.join("\n");
}
