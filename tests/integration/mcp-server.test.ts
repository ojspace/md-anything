import { describe, expect, test, afterAll } from "bun:test";
import { join } from "node:path";
import { writeFile, mkdir, rm } from "node:fs/promises";
import { spawn, type ChildProcess } from "node:child_process";

const SRC = join(import.meta.dir, "../../src");
const TMP = join(import.meta.dir, "../tmp-mcp-tests");

let requestId = 0;

function nextId(): number {
  return ++requestId;
}

function sendRequest(proc: ChildProcess, method: string, params: Record<string, unknown> = {}): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const id = nextId();
    const msg = JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n";

    const timeout = setTimeout(() => reject(new Error(`Timeout waiting for response to ${method}`)), 15000);

    const onData = (data: Buffer) => {
      const lines = data.toString().split("\n").filter(Boolean);
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.id === id) {
            clearTimeout(timeout);
            proc.stdout?.off("data", onData);
            if (parsed.error) {
              reject(new Error(`MCP error: ${JSON.stringify(parsed.error)}`));
            } else {
              resolve(parsed.result);
            }
            return;
          }
        } catch {
          // Not JSON or not our response, skip
        }
      }
    };

    proc.stdout?.on("data", onData);
    proc.stdin?.write(msg);
  });
}

function startServer(): Promise<{ proc: ChildProcess; cleanup: () => Promise<void> }> {
  return new Promise((resolve, reject) => {
    const proc = spawn("bun", ["run", join(SRC, "mcp.ts")], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env },
    });

    let started = false;

    proc.stdout?.on("data", () => {
      if (!started) {
        started = true;
        resolve({
          proc,
          cleanup: async () => {
            proc.kill();
            await rm(TMP, { recursive: true, force: true }).catch(() => {});
          },
        });
      }
    });

    proc.on("error", reject);

    // Send initialize to trigger a response and confirm the server is alive
    const initMsg =
      JSON.stringify({
        jsonrpc: "2.0",
        id: 0,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "test", version: "0.0.0" },
        },
      }) + "\n";
    proc.stdin?.write(initMsg);

    setTimeout(() => {
      if (!started) {
        proc.kill();
        reject(new Error("MCP server failed to start"));
      }
    }, 10000);
  });
}

describe("mcp server", () => {
  let proc: ChildProcess;
  let cleanup: () => Promise<void>;

  test("server starts and responds to initialize", async () => {
    const result = await startServer();
    proc = result.proc;
    cleanup = result.cleanup;
    expect(proc.pid).toBeDefined();
  });

  test("lists tools: convert, ingest, doctor", async () => {
    const result = (await sendRequest(proc, "tools/list")) as { tools: Array<{ name: string }> };
    const names = result.tools.map((t) => t.name);
    expect(names).toContain("convert");
    expect(names).toContain("ingest");
    expect(names).toContain("doctor");
  });

  test("doctor tool returns capabilities", async () => {
    const result = (await sendRequest(proc, "tools/call", {
      name: "doctor",
      arguments: {},
    })) as { content: Array<{ type: string; text: string }>; structuredContent: Record<string, unknown> };

    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toContain("md-anything capabilities");
    expect(result.structuredContent.capabilities).toBeDefined();
    expect(result.structuredContent.workspaceRoot).toBeDefined();
  });

  test("convert tool works with a text file", async () => {
    await mkdir(TMP, { recursive: true });
    const testFile = join(TMP, "hello.txt");
    await writeFile(testFile, "Hello, MCP World!");

    const result = (await sendRequest(proc, "tools/call", {
      name: "convert",
      arguments: { input: testFile, frontmatter: false },
    })) as { content: Array<{ type: string; text: string }>; structuredContent: Record<string, unknown> };

    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toContain("Hello, MCP World!");
    expect(result.structuredContent.kind).toBe("text");
    expect(result.structuredContent.markdown).toContain("Hello, MCP World!");
  });

  test("convert tool rejects path outside workspace", async () => {
    const result = (await sendRequest(proc, "tools/call", {
      name: "convert",
      arguments: { input: "/etc/passwd" },
    })) as { isError: boolean; content: Array<{ text: string }> };

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("workspace");
  });

  test("convert tool rejects localhost URLs", async () => {
    const result = (await sendRequest(proc, "tools/call", {
      name: "convert",
      arguments: { input: "http://localhost:3000" },
    })) as { isError: boolean; content: Array<{ text: string }> };

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Private");
  });

  test("lists resources", async () => {
    const result = (await sendRequest(proc, "resources/list")) as {
      resources: Array<{ uri: string; name: string }>;
    };
    const uris = result.resources.map((r) => r.uri);
    expect(uris).toContain("md-anything://doctor");
    expect(uris).toContain("md-anything://workspace-policy");
  });

  test("reads doctor resource", async () => {
    const result = (await sendRequest(proc, "resources/read", {
      uri: "md-anything://doctor",
    })) as { contents: Array<{ text: string }> };

    expect(result.contents[0].text).toContain("md-anything capabilities");
  });

  test("reads workspace policy resource", async () => {
    const result = (await sendRequest(proc, "resources/read", {
      uri: "md-anything://workspace-policy",
    })) as { contents: Array<{ text: string }> };

    const policy = JSON.parse(result.contents[0].text);
    expect(policy.workspaceRoot).toBeDefined();
    expect(policy.localPaths).toBe("restricted-to-workspace-root");
  });

  test("lists prompts", async () => {
    const result = (await sendRequest(proc, "prompts/list")) as {
      prompts: Array<{ name: string }>;
    };
    const names = result.prompts.map((p) => p.name);
    expect(names).toContain("analyze_document");
    expect(names).toContain("summarize_document_chunks");
  });

  test("analyze_document prompt requires input", async () => {
    try {
      await sendRequest(proc, "prompts/get", {
        name: "analyze_document",
        arguments: {},
      });
      expect(true).toBe(false); // Should not reach here
    } catch (err) {
      expect((err as Error).message).toContain("input");
    }
  });

  afterAll(async () => {
    if (cleanup) await cleanup();
  });
});
