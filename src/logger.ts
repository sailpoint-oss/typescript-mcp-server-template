/**
 * The MCP stdio transport uses stdout exclusively for JSON-RPC frames. Anything
 * else written there corrupts the stream, and the SailPoint SDK writes
 * diagnostics with `console.log` (e.g. "unable to find config file..."), so
 * every console channel is pinned to stderr before the SDK is touched.
 */
export function redirectConsoleToStderr(): void {
  const write = (...args: unknown[]) => {
    process.stderr.write(
      args
        .map((a) => (typeof a === "string" ? a : safeStringify(a)))
        .join(" ") + "\n",
    );
  };

  console.log = write;
  console.info = write;
  console.debug = write;
  console.warn = write;
  console.error = write;
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function log(message: string, detail?: unknown): void {
  const suffix = detail === undefined ? "" : ` ${safeStringify(detail)}`;
  process.stderr.write(`[sailpoint-mcp] ${message}${suffix}\n`);
}
