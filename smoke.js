const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StdioClientTransport } = require("@modelcontextprotocol/sdk/client/stdio.js");

(async () => {
  const transport = new StdioClientTransport({
    command: "node",
    args: [__dirname + "/dist/index.js"],
    env: { ...process.env },
    stderr: "inherit",
  });
  const client = new Client({ name: "smoke", version: "0" });
  await client.connect(transport);
  console.log(JSON.stringify(await client.listTools(), null, 2));
  const res = await client.callTool({
    name: "search_identities",
    arguments: { query: "*", limit: 1, attributes: ["id", "name"] },
  });
  console.log("CALL:", JSON.stringify(res).slice(0, 600));
  await client.close();
})().catch((e) => { console.error("FAIL", e); process.exit(1); });
