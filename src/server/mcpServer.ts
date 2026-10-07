import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { logger } from "../utils/logger.js";
import { toolHandlers, tools } from "./toolRegistry.js";

export function createMcpServer(): Server {
  const server = new Server(
    { name: "knowledge-mcp", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;
    const handler = toolHandlers[name];
    if (!handler) {
      return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
    }
    try {
      const result = await handler(args);
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected tool error";
      logger.error({ tool: name, err: error }, "MCP tool failed");
      return { content: [{ type: "text", text: message }], isError: true };
    }
  });
  return server;
}
