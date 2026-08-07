import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  Index,
  QueryType,
  type Search,
} from "sailpoint-api-client/dist/search/api";
import { z } from "zod";

import { getSearchApi } from "../sailpoint";
import { log } from "../logger";

const MAX_LIMIT = 250;

const inputSchema = {
  query: z
    .string()
    .min(1)
    .describe(
      'Search query in SailPoint/Elasticsearch query-string syntax, scoped to the identities index. Examples: "*" for everything, "attributes.department:Engineering", ' +
        '"name:Aaron*", "attributes.cloudLifecycleState:active AND attributes.country:US", "@access(name:\\"Administrator\\")".',
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(MAX_LIMIT)
    .default(25)
    .describe(`Maximum identities to return (1-${MAX_LIMIT}).`),
  offset: z
    .number()
    .int()
    .min(0)
    .default(0)
    .describe("Offset into the result set, for paging."),
  sort: z
    .array(z.string())
    .optional()
    .describe(
      'Fields to sort by; prefix with "-" for descending. Example: ["displayName", "-created"].',
    ),
  attributes: z
    .array(z.string())
    .optional()
    .describe(
      'Restrict returned fields, which keeps responses small. Example: ["id", "name", "displayName", "email", "attributes.department"].',
    ),
  includeNested: z
    .boolean()
    .default(false)
    .describe(
      "Include nested objects (access, accounts, apps) on each identity. Substantially larger responses.",
    ),
  count: z
    .boolean()
    .default(false)
    .describe(
      "Also return the total number of matching identities, ignoring limit/offset. Adds latency.",
    ),
};

export function registerSearchIdentities(server: McpServer): void {
  server.registerTool(
    "search_identities",
    {
      title: "Search identities",
      description:
        "Search identities in SailPoint Identity Security Cloud using the search API. " +
        "Use this to find users by name, email, attribute, lifecycle state, manager, source, or entitlement/role access. " +
        "Returns matching identity documents from the 'identities' index.",
      inputSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ query, limit, offset, sort, attributes, includeNested, count }) => {
      const search: Search = {
        indices: [Index.Identities],
        queryType: QueryType.Sailpoint,
        query: { query },
        includeNested,
        ...(sort?.length ? { sort } : {}),
        ...(attributes?.length
          ? { queryResultFilter: { includes: attributes } }
          : {}),
      };

      try {
        const response = await getSearchApi().searchPostV1({
          search,
          limit,
          offset,
          count,
        });

        const identities = response.data ?? [];
        const totalCount = response.headers?.["x-total-count"];

        const result = {
          query,
          returned: identities.length,
          ...(totalCount !== undefined ? { totalCount: Number(totalCount) } : {}),
          offset,
          limit,
          identities,
        };

        return {
          content: [
            { type: "text" as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      } catch (error) {
        const message = describeError(error);
        log("search_identities failed", message);
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: `Identity search failed: ${message}`,
            },
          ],
        };
      }
    },
  );
}

function describeError(error: unknown): string {
  const axiosLike = error as {
    response?: { status?: number; statusText?: string; data?: unknown };
    message?: string;
  };

  if (axiosLike?.response) {
    const { status, statusText, data } = axiosLike.response;
    const body =
      typeof data === "string" ? data : data ? JSON.stringify(data) : "";
    return `HTTP ${status ?? "?"} ${statusText ?? ""} ${body}`.trim();
  }

  return axiosLike?.message ?? String(error);
}
