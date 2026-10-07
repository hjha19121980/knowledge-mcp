# knowledge-mcp

An enterprise knowledge retrieval MCP server for organizational documents. It provides keyword and vector search, document retrieval and summaries, related-document recommendations, category search, recent/popular listings, metadata, and an ingestion pipeline for PDF, DOCX, TXT, Markdown, and HTML.

## Requirements

Each user runs the MCP server on their own computer; there is no hosted or deployed MCP endpoint. Each computer needs:

- Node.js 22+
- Docker Desktop (for the included local PostgreSQL setup), or a PostgreSQL server with pgvector
- An OpenAI API key, or Azure OpenAI endpoint, key, and deployments for embeddings and summaries
- VS Code with MCP support, Claude Code, or another MCP client that supports stdio servers

## Clone and build locally

In PowerShell, choose a local directory and clone the repository:

```powershell
git clone https://github.com/hjha19121980/knowledge-mcp.git
Set-Location .\knowledge-mcp
npm ci
npm run build
```

Start the local PostgreSQL database with pgvector. The included Compose file starts only PostgreSQL; the MCP client will launch the server process when it connects:

```powershell
docker compose up -d postgres
```

Create a local environment file and edit it:

```powershell
Copy-Item .env.example .env
notepad .env
```

Set `DATABASE_URL` to `postgresql://knowledge:knowledge@localhost:5432/knowledge` for the default local Compose database. Set `OPENAI_API_KEY` for OpenAI, or change `EMBEDDING_PROVIDER=azure` and fill in the Azure OpenAI settings. Keep `.env` private; do not commit API keys or database credentials. The Compose database credentials are development defaults—change them before using this setup beyond a personal development machine, and keep `POSTGRES_PASSWORD` and `DATABASE_URL` consistent.

The database schema is mounted into PostgreSQL and applied automatically the first time its data volume is initialized. If you use an existing PostgreSQL database, apply `schema.sql` yourself before connecting. The schema uses 1536-dimensional vectors by default, matching `text-embedding-3-small`. If selecting a different embedding dimension, update `EMBEDDING_DIMENSIONS` and each `vector(1536)` declaration in `schema.sql` together. All vectors in one database must use the same embedding model and dimension.

## Connect from VS Code

Add an MCP server configuration to the VS Code workspace where you want to use the tools. Create `.vscode/mcp.json` in that workspace (or open the MCP configuration editor from VS Code) and use the absolute paths to your local clone. Replace the example user name and path with the path on your computer:

```json
{
  "servers": {
    "knowledge-mcp": {
      "type": "stdio",
      "command": "node",
      "args": [
        "C:\\Users\\you\\src\\knowledge-mcp\\dist\\index.js"
      ],
      "env": {
        "DOTENV_CONFIG_PATH": "C:\\Users\\you\\src\\knowledge-mcp\\.env"
      }
    }
  }
}
```

Save the file, trust the workspace if prompted, then start `knowledge-mcp` from the VS Code MCP server controls (the MCP icon/view or the server entry in the configuration editor). VS Code starts the local Node process on demand; you do not need to run `npm start` in a separate terminal. If `node` is not found when VS Code launches it, use the absolute path to your Node.js executable as `command`.

Keep a personal `.vscode/mcp.json` out of shared commits if it contains machine-specific paths. The `.env` path above points the server to its local secrets file; secrets themselves do not belong in the MCP JSON.

## Connect from Claude Code

With Claude Code installed, register the cloned server for your user from PowerShell. Substitute the path to your clone:

```powershell
claude mcp add --scope user --transport stdio `
  --env "DOTENV_CONFIG_PATH=C:\Users\you\src\knowledge-mcp\.env" `
  knowledge-mcp -- node "C:\Users\you\src\knowledge-mcp\dist\index.js"
```

`--scope user` makes this local configuration available to your Claude Code sessions for your account. To check the registration, run `claude mcp list`; open or restart a Claude Code session and approve/start the server if prompted. Remove it later with `claude mcp remove knowledge-mcp`.

## Connect from another MCP client

This server uses MCP stdio transport. Configure the client to run `node` with the absolute path to `dist/index.js`, and set `DOTENV_CONFIG_PATH` to the absolute path to the clone's `.env` file. The MCP client starts and stops the server process; do not expose it as a network service. MCP protocol messages use stdout, while Pino logs go to stderr.

## Troubleshooting

- **`DATABASE_URL is missing`**: create `.env` from `.env.example`, or check that `DOTENV_CONFIG_PATH` points to the `.env` file in your clone.
- **Database connection refused**: check `docker compose ps` and `docker compose logs postgres`; start the database with `docker compose up -d postgres`.
- **pgvector extension/schema errors**: ensure the database was initialized from `schema.sql`, or apply the schema to the existing database.
- **Embedding or summary requests fail**: verify the selected provider's API key, endpoint, deployment/model, network access, and configured vector dimension.
- **Changes are not reflected**: run `npm run build` again; MCP clients execute the generated `dist/index.js`.

## Available tools

`search_knowledge` supports keyword search, category/tag filters, relevance/recent/title sorting, and limit/offset pagination. Other tools include `get_document`, `semantic_search`, `summarize_document`, `find_related_documents`, `search_by_category`, `recent_documents`, `popular_documents`, and `document_metadata`. Document reads increment `access_count`, which powers popular-document rankings.

## Ingestion

Use `ingestionService.ingestFile(path, metadata)` or `ingestionService.ingestBulk(directory, metadataForFile)` from the service API. Metadata must include a title and category; tags, sourceUrl, author, version, and documentId are optional. Ingestion extracts text, splits it into 1000-character chunks with 200-character overlap, creates document and chunk embeddings, and persists everything atomically. Updating requires an existing UUID in `documentId`. Category rows are created as documents are ingested.

## Development

```sh
npm ci
npm run typecheck
npm test
npm run build
```

For local manual startup while debugging, run `npm start` from the repository after setting up `.env` and PostgreSQL. This starts an stdio MCP server and waits for an MCP client; it is not a web server or an interactive command-line interface.
