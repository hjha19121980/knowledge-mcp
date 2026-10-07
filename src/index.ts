import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "./server/mcpServer.js";
import { closeDatabase, pool } from "./database/postgres.js";
import { logger } from "./utils/logger.js";

const server = createMcpServer();
const transport = new StdioServerTransport();

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, "Shutting down knowledge MCP server");
  await server.close();
  await closeDatabase();
  process.exit(0);
}

process.once("SIGINT", () => void shutdown("SIGINT").catch((error: unknown) => {
  logger.fatal({ err: error }, "Shutdown failed");
  process.exit(1);
}));
process.once("SIGTERM", () => void shutdown("SIGTERM").catch((error: unknown) => {
  logger.fatal({ err: error }, "Shutdown failed");
  process.exit(1);
}));

try {
  await pool.query("SELECT 1");
  const extension = await pool.query<{ installed: boolean }>(
    "SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') AS installed"
  );
  if (!extension.rows[0]?.installed) {
    throw new Error("PostgreSQL extension pgvector is not installed; apply schema.sql before starting the server");
  }
  await pool.query("SELECT id FROM knowledge_documents LIMIT 0");
  await server.connect(transport);
  logger.info("knowledge-mcp server started over stdio");
} catch (error) {
  logger.fatal({ err: error }, "Unable to start knowledge MCP server");
  await closeDatabase();
  process.exitCode = 1;
}
