#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { redirectConsoleToStderr, log } from "./logger";
import { createConfiguration } from "./sailpoint";
import { registerSearchIdentities } from "./tools/searchIdentities";

async function main(): Promise<void> {
  // Before anything that might log: the SailPoint SDK writes diagnostics with
  // console.log, which would corrupt the JSON-RPC stream on stdout.
  redirectConsoleToStderr();

  // Fail fast with a clear message instead of on the first tool call.
  createConfiguration();

  const server = new McpServer({
    name: "sailpoint-mcp-server",
    version: "0.1.0",
  });

  registerSearchIdentities(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  log("server ready on stdio");
}

main().catch((error) => {
  log("fatal", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
