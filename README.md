# knowledge-mcp

An enterprise knowledge retrieval MCP server for organizational documents. It provides keyword and vector search, document retrieval and summaries, related-document recommendations, category search, recent/popular listings, metadata, and an ingestion pipeline for PDF, DOCX, TXT, Markdown, and HTML.

## Requirements

- Node.js 22+
- PostgreSQL with pgvector (the included Compose file uses `pgvector/pgvector:pg16`)
- OpenAI or Azure OpenAI credentials for embeddings and summaries

## Setup

1. Copy `.env.example` to `.env` and configure `DATABASE_URL` and the embedding provider credentials.
2. Start PostgreSQL with `docker compose up -d postgres`, or provision PostgreSQL and apply `schema.sql`. Compose credentials are local-development defaults; override `POSTGRES_PASSWORD` and set a matching `DATABASE_URL_DOCKER` before deploying beyond a local development environment.
3. Install and build: `npm ci && npm run build`.
4. Start the stdio MCP server: `npm start`.

The database schema uses 1536-dimensional vectors by default, matching `text-embedding-3-small`. If selecting a different embedding model/dimension, update `EMBEDDING_DIMENSIONS` and the `vector(1536)` dimensions in `schema.sql` together. All stored vectors in a database must come from the same embedding model.

Configure the MCP client to launch `node <absolute-path>/dist/index.js` with the environment variables from `.env`. MCP protocol traffic uses stdout; structured logs are emitted separately by Pino.

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
