import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { log } from "./logger";

/**
 * Load `.env` from the repo root, if present. MCP clients launch the server
 * from their own working directory, so the path is resolved from this file
 * (`dist/env.js` -> `..`) rather than the cwd. Variables already set in the
 * environment (a client `env` block, an exported shell var) always win.
 */
export function loadDotEnv(): void {
  const envPath = resolve(__dirname, "..", ".env");
  if (!existsSync(envPath)) {
    return;
  }
  process.loadEnvFile(envPath);
  log("loaded credentials from", envPath);
}
