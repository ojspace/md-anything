#!/usr/bin/env bun
/**
 * md-anything MCP Server
 * Exposes convert, ingest, doctor, resources, and prompts for local agent use.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { buildDoctorMarkdown } from "./core/doctor";
import { convertToMarkdown } from "./core/convert";
import { ingestFolder } from "./core/ingest";
import { detectCapabilities } from "./core/runtime";
import { DEFAULT_CONFIG } from "./config/defaults";
import { createRuntimeProviders } from "./core/runtime";
import {
  buildAnalysisPrompt,
  buildConvertStructuredContent,
  buildIngestStructuredContent,
  buildToolErrorResult,
  buildWorkspacePolicy,
  buildWorkspaceResourceUri,
  MCP_DOCTOR_RESOURCE_URI,
  MCP_POLICY_RESOURCE_URI,
  McpInputError,
  parseWorkspaceResourceUri,
  resolveMcpInput,
  resolveWorkspacePath,
} from "./mcp-support";

const runtime = createRuntimeProviders(DEFAULT_CONFIG);
const workspaceRoot = process.cwd();

const server = new Server(
  { name: "md-anything", version: "0.2.0" },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
    instructions:
      "Use md-anything to convert workspace files and safe remote URLs into Markdown. Local paths are restricted to the current workspace root, and private/localhost URLs are blocked by default.",
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "convert",
      description:
        "Convert a workspace file or safe remote URL to Markdown. Returns Markdown text plus structured metadata, provenance, and chunks. Local paths must stay inside the current workspace root.",
      inputSchema: {
        type: "object" as const,
        properties: {
          input: {
            type: "string",
            description: "Workspace-relative file path, workspace absolute path, or safe http/https URL.",
          },
          frontmatter: {
            type: "boolean",
            description: "Include YAML frontmatter with metadata in the Markdown output (default: true).",
          },
        },
        required: ["input"],
      },
    },
    {
      name: "ingest",
      description:
        "Batch-convert all supported files in a workspace folder. Returns a human-readable summary plus structured per-document metadata, provenance, and chunks.",
      inputSchema: {
        type: "object" as const,
        properties: {
          folder: {
            type: "string",
            description: "Workspace-relative or workspace-absolute folder path.",
          },
          recursive: {
            type: "boolean",
            description: "Process subdirectories recursively (default: false).",
          },
        },
        required: ["folder"],
      },
    },
    {
      name: "doctor",
      description:
        "Report current md-anything capabilities and optional local/remote upgrades. Returns a Markdown summary and structured capability flags.",
      inputSchema: {
        type: "object" as const,
        properties: {},
      },
    },
  ],
}));

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: MCP_DOCTOR_RESOURCE_URI,
      name: "doctor",
      title: "Capability snapshot",
      mimeType: "text/markdown",
      description: "Current md-anything capability snapshot for this machine.",
    },
    {
      uri: MCP_POLICY_RESOURCE_URI,
      name: "workspace-policy",
      title: "Workspace policy",
      mimeType: "application/json",
      description: "Current MCP workspace root and safety guardrails for local paths and remote URLs.",
    },
  ],
}));

server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
  resourceTemplates: [
    {
      uriTemplate: "md-anything://workspace/{path}",
      name: "workspace-conversion",
      title: "Workspace file as Markdown",
      mimeType: "text/markdown",
      description:
        "Read a workspace-relative file through md-anything's shared conversion pipeline. Paths are restricted to the current workspace root.",
    },
  ],
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  if (uri === MCP_DOCTOR_RESOURCE_URI) {
    return {
      contents: [
        {
          uri,
          mimeType: "text/markdown",
          text: buildDoctorMarkdown(detectCapabilities()),
        },
      ],
    };
  }

  if (uri === MCP_POLICY_RESOURCE_URI) {
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(buildWorkspacePolicy(workspaceRoot), null, 2),
        },
      ],
    };
  }

  const workspaceRelativePath = parseWorkspaceResourceUri(uri);
  const { resolvedPath } = resolveWorkspacePath(workspaceRelativePath, workspaceRoot);
  const result = await convertToMarkdown(
    { input: resolvedPath, options: { ...DEFAULT_CONFIG.options, frontmatter: true } },
    runtime,
  );

  return {
    contents: [
      {
        uri,
        mimeType: "text/markdown",
        text: result.markdown,
        _meta: {
          documentId: result.document.provenance?.documentId,
          chunkCount: result.chunks.length,
        },
      },
    ],
  };
});

server.setRequestHandler(ListPromptsRequestSchema, async () => ({
  prompts: [
    {
      name: "analyze_document",
      title: "Analyze converted document",
      description:
        "Guides the model to call md-anything convert first, then answer with Markdown, provenance, and chunk-aware citations.",
      arguments: [
        { name: "input", description: "Workspace file path or safe remote URL.", required: true },
        { name: "question", description: "Specific question to answer about the converted document." },
      ],
    },
    {
      name: "summarize_document_chunks",
      title: "Summarize by chunks",
      description:
        "Guides the model to summarize a document section-by-section using md-anything chunk output.",
      arguments: [{ name: "input", description: "Workspace file path or safe remote URL.", required: true }],
    },
  ],
}));

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const input = args?.input;

  if (!input) {
    throw new McpInputError("missing_prompt_input", "Prompt argument `input` is required.");
  }

  if (name === "analyze_document") {
    return {
      description: "Convert a document with md-anything and answer a grounded question about it.",
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: buildAnalysisPrompt(input, args?.question),
          },
        },
      ],
    };
  }

  if (name === "summarize_document_chunks") {
    return {
      description: "Convert a document with md-anything and summarize it using chunk-aware structure.",
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: [
              `Use the \`convert\` tool on \`${input}\` first.`,
              "Then summarize the document chunk-by-chunk.",
              "Group related chunks by heading path, and mention page ranges when present.",
              "Call out weak extraction notes if the metadata suggests low confidence output.",
            ].join("\n"),
          },
        },
      ],
    };
  }

  throw new McpInputError("unknown_prompt", `Unknown prompt: ${name}`);
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "convert") {
    try {
      const { input, frontmatter = true } = args as {
        input: string;
        frontmatter?: boolean;
      };

      const resolved = resolveMcpInput(input, workspaceRoot);
      const result = await convertToMarkdown(
        { input: resolved.resolvedInput, options: { ...DEFAULT_CONFIG.options, frontmatter } },
        runtime,
      );

      const content: Array<
        | { type: "text"; text: string }
        | {
            type: "resource_link";
            uri: string;
            name: string;
            title: string;
            mimeType: string;
            description: string;
          }
      > = [
        {
          type: "text" as const,
          text: result.markdown,
        },
      ];

      if (resolved.workspaceRelativePath) {
        content.push({
          type: "resource_link" as const,
          uri: buildWorkspaceResourceUri(resolved.workspaceRelativePath),
          name: `workspace:${resolved.workspaceRelativePath}`,
          title: result.document.title,
          mimeType: "text/markdown",
          description: "Readable Markdown resource for this workspace file.",
        });
      }

      return {
        content,
        structuredContent: buildConvertStructuredContent(result, resolved.workspaceRelativePath),
      };
    } catch (error) {
      return buildToolErrorResult(error instanceof Error ? error : new Error(String(error)));
    }
  }

  if (name === "ingest") {
    try {
      const { folder, recursive = false } = args as {
        folder: string;
        recursive?: boolean;
      };

      const resolvedFolder = resolveWorkspacePath(folder, workspaceRoot);
      const result = await ingestFolder(resolvedFolder.resolvedPath, runtime, { recursive });

      const summary = [
        `Ingested ${result.converted} files, ${result.skipped} skipped, ${result.failed} failed.`,
        "",
        ...result.docs.map(
          (doc) =>
            `### ${doc.title}\n**Source:** ${doc.source}\n**Type:** ${doc.sourceType}\n**Chunks:** ${doc.chunks?.length ?? 0}\n`,
        ),
      ].join("\n");

      return {
        content: [{ type: "text" as const, text: summary }],
        structuredContent: buildIngestStructuredContent(result),
      };
    } catch (error) {
      return buildToolErrorResult(error instanceof Error ? error : new Error(String(error)));
    }
  }

  if (name === "doctor") {
    const caps = detectCapabilities();
    return {
      content: [{ type: "text" as const, text: buildDoctorMarkdown(caps) }],
      structuredContent: {
        capabilities: caps,
        workspaceRoot,
      },
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
