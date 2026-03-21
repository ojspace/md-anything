import { describe, expect, test } from "bun:test";
import {
  buildWorkspacePolicy,
  buildWorkspaceResourceUri,
  MCP_DOCTOR_RESOURCE_URI,
  MCP_POLICY_RESOURCE_URI,
  McpInputError,
  parseWorkspaceResourceUri,
  resolveMcpInput,
  resolveWorkspacePath,
  validateRemoteUrl,
} from "../../src/mcp-support";

describe("mcp support", () => {
  test("resolveWorkspacePath allows files inside the workspace root", () => {
    const resolved = resolveWorkspacePath("tests/fixtures/sample.txt", "/repo");

    expect(resolved.resolvedPath).toBe("/repo/tests/fixtures/sample.txt");
    expect(resolved.workspaceRelativePath).toBe("tests/fixtures/sample.txt");
  });

  test("resolveWorkspacePath rejects paths outside the workspace root", () => {
    expect(() => resolveWorkspacePath("../secret.txt", "/repo")).toThrow(McpInputError);
  });

  test("validateRemoteUrl accepts public http and https URLs", () => {
    expect(validateRemoteUrl("https://example.com/path")).toBe("https://example.com/path");
    expect(validateRemoteUrl("http://example.com")).toBe("http://example.com/");
  });

  test("validateRemoteUrl rejects localhost and private network targets", () => {
    expect(() => validateRemoteUrl("http://localhost:3000")).toThrow(McpInputError);
    expect(() => validateRemoteUrl("http://127.0.0.1:8080")).toThrow(McpInputError);
    expect(() => validateRemoteUrl("http://192.168.1.15")).toThrow(McpInputError);
  });

  test("workspace resource URIs round-trip cleanly", () => {
    const uri = buildWorkspaceResourceUri("tests/fixtures/sample.txt");

    expect(uri).toBe("md-anything://workspace/tests/fixtures/sample.txt");
    expect(parseWorkspaceResourceUri(uri)).toBe("tests/fixtures/sample.txt");
  });

  test("resolveMcpInput distinguishes URLs from local files", () => {
    const urlInput = resolveMcpInput("https://example.com/article", "/repo");
    const fileInput = resolveMcpInput("tests/fixtures/sample.txt", "/repo");

    expect(urlInput.isUrl).toBe(true);
    expect(fileInput.isUrl).toBe(false);
    expect(fileInput.workspaceRelativePath).toBe("tests/fixtures/sample.txt");
  });

  test("workspace policy exposes the expected static resources", () => {
    const policy = buildWorkspacePolicy("/repo");

    expect(policy.workspaceRoot).toBe("/repo");
    expect(policy.resources).toEqual({
      workspaceTemplate: "md-anything://workspace/{path}",
      doctor: MCP_DOCTOR_RESOURCE_URI,
      workspacePolicy: MCP_POLICY_RESOURCE_URI,
    });
  });
});
