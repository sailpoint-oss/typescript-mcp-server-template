import { Configuration } from "sailpoint-api-client";
import { SearchApi } from "sailpoint-api-client/dist/search/api";

const SETUP_HINT =
  "Copy .env.example to .env and set SAIL_BASE_URL, SAIL_CLIENT_ID and " +
  "SAIL_CLIENT_SECRET (a personal access token pair from your tenant), or pass " +
  "them in your MCP client's env block. See README.md.";

/**
 * Credentials come from SAIL_* environment variables, which `loadDotEnv()`
 * populates from the repo's `.env` at startup. `Configuration` reads them
 * itself (falling back to ./config.json and ~/.sailpoint/config.yaml, which
 * this template does not use). It resolves partial
 * configs silently (an OAuth-flavoured config.yaml yields a base URL but no
 * client credentials), so validate the pieces we actually need here — otherwise
 * the failure surfaces as an opaque "Invalid URL" on the first tool call.
 */
export function createConfiguration(): Configuration {
  const configuration = new Configuration();

  const missing = (
    [
      ["base URL", configuration.basePath],
      ["client ID", configuration.clientId],
      ["client secret", configuration.clientSecret],
      ["token URL", configuration.tokenUrl],
    ] as const
  )
    .filter(([, value]) => !value)
    .map(([label]) => label);

  if (missing.length > 0) {
    throw new Error(
      `Incomplete SailPoint configuration (missing: ${missing.join(", ")}). ${SETUP_HINT}`,
    );
  }

  // The constructor kicks off the client-credentials token request eagerly and
  // stores the promise. Attach a no-op handler so a credential failure can't
  // become an unhandled rejection; awaiters still receive the real error.
  if (configuration.accessToken instanceof Promise) {
    configuration.accessToken.catch(() => undefined);
  }

  return configuration;
}

let searchApi: SearchApi | undefined;

/** Lazily built and reused so the OAuth token cache is shared across calls. */
export function getSearchApi(): SearchApi {
  if (!searchApi) {
    searchApi = new SearchApi(createConfiguration());
  }
  return searchApi;
}
