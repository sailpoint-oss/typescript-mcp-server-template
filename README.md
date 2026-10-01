# typescript-mcp-server-template

A TypeScript [Model Context Protocol](https://modelcontextprotocol.io) server for
SailPoint Identity Security Cloud, built on the official
[SailPoint TypeScript SDK](https://github.com/sailpoint-oss/typescript-sdk)
(`sailpoint-api-client`).

Currently exposes one tool: **`search_identities`**.

## Setup

```bash
npm install
npm run build
```

## Configuration

Credentials are read from `SAIL_BASE_URL`, `SAIL_CLIENT_ID` and
`SAIL_CLIENT_SECRET`. At startup the server loads them from `.env` in the
project root. Create a
personal access token in your tenant under **Preferences → Personal Access
Tokens**; it needs a role that can read identities (e.g. `sp:scopes:all` or
an admin/helpdesk role).

```bash
cp .env.example .env   # then fill in your three values
chmod 600 .env
```

The server loads `.env` from its own project folder, so it works no matter which
directory the MCP client launches it from. Keep the file private: it is
gitignored, and `chmod 600 .env` makes it readable only by you. Variables set in
your shell or in an MCP client's `env` block take precedence over `.env`.

## Running

```bash
npm start          # node dist/index.js — speaks MCP over stdio
```

### Register with Claude Code

```bash
claude mcp add sailpoint -- node /absolute/path/to/typescript-mcp-server/dist/index.js
```

### Register with Claude Desktop / other clients

```json
{
  "mcpServers": {
    "sailpoint": {
      "command": "node",
      "args": ["/absolute/path/to/sailpoint-mcp-server/dist/index.js"]
    }
  }
}
```

## Tool: `search_identities`

Wraps `POST /search/v1` (`SearchApi.searchPostV1`) against the `identities`
index with `queryType: SAILPOINT`.

| Parameter       | Type       | Default | Description                                                              |
| --------------- | ---------- | ------- | ------------------------------------------------------------------------ |
| `query`         | `string`   | —       | Query-string syntax, e.g. `attributes.department:Engineering`             |
| `limit`         | `number`   | `25`    | 1–250 results                                                            |
| `offset`        | `number`   | `0`     | Paging offset                                                            |
| `sort`          | `string[]` | —       | e.g. `["displayName", "-created"]`                                       |
| `attributes`    | `string[]` | —       | Restrict returned fields (`queryResultFilter.includes`) to keep responses small |
| `includeNested` | `boolean`  | `false` | Include nested `access`, `accounts`, `apps` objects                      |
| `count`         | `boolean`  | `false` | Also return the total match count from `X-Total-Count`                   |

Example query strings:

```
*
name:Aaron*
attributes.cloudLifecycleState:active AND attributes.country:US
@access(name:"Administrator")
```

Response is JSON text containing `query`, `returned`, `offset`, `limit`,
optional `totalCount`, and the `identities` array.

Errors (auth failures, bad queries) are returned as MCP tool errors with the
HTTP status and response body, rather than crashing the server.

## Development

```bash
npm run typecheck   # tsc --noEmit
npm run watch       # incremental build
node smoke.js       # handshake + tools/list + one live search_identities call
```

`smoke.js` requires working credentials for the tool call to succeed; the
handshake and `tools/list` portions work without them.

## Notes

- The project is CommonJS: `sailpoint-api-client` is CJS-only and several of its
  value exports (`Index`, `QueryType`) are not reachable via ESM named imports.
  Those are imported from `sailpoint-api-client/dist/search/api`, since the
  package root re-exports API classes but not the search enums.
- All logging goes to stderr. The SDK writes diagnostics with `console.log`,
  which would corrupt the JSON-RPC framing on stdout, so every `console` channel
  is redirected at startup ([src/logger.ts](src/logger.ts)).

## Adding more tools

Add a `register*` function under [src/tools/](src/tools/) following
[searchIdentities.ts](src/tools/searchIdentities.ts), then call it from
[src/index.ts](src/index.ts). Reuse `getSearchApi()` — or add a sibling accessor
in [src/sailpoint.ts](src/sailpoint.ts) for other SDK API classes — so the
resolved token is shared.
