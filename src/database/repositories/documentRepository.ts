import type { PoolClient } from "pg";
import { pool } from "../postgres.js";
import type { DocumentListResult, DocumentMetadata, DocumentSearchResult, IngestDocumentInput, KnowledgeDocument, SearchOptions } from "../../types/knowledgeTypes.js";
import { config } from "../../utils/config.js";

function vectorLiteral(vector: number[]): string {
  return `[${vector.join(",")}]`;
}

export const documentRepository = {
  async search(query: string, options: SearchOptions): Promise<DocumentSearchResult[]> {
    const orderBy = options.sort === "recent" ? "kd.updated_at DESC" :
      options.sort === "title" ? "kd.title ASC" : "score DESC, kd.updated_at DESC";
    const result = await pool.query<DocumentSearchResult>(
      `SELECT kd.id AS "documentId", kd.title, kd.category,
        ROUND((CASE WHEN kd.title ILIKE $1 THEN 70 ELSE 0 END
          + CASE WHEN kd.content ILIKE $1 THEN 25 ELSE 0 END
          + CASE WHEN kd.category ILIKE $1 THEN 5 ELSE 0 END)::numeric, 2)::float AS score,
        kd.updated_at AS "updatedAt"
       FROM knowledge_documents kd
       WHERE ($2::text IS NULL OR kd.category ILIKE $2)
         AND ($3::text[] IS NULL OR kd.tags @> $3)
         AND (kd.title ILIKE $1 OR kd.content ILIKE $1 OR kd.category ILIKE $1 OR EXISTS (
           SELECT 1 FROM unnest(kd.tags) tag WHERE tag ILIKE $1
         ))
       ORDER BY ${orderBy} LIMIT $4 OFFSET $5`,
      [`%${query}%`, options.category ?? null, options.tags ?? null, options.limit, options.offset]
    );
    return result.rows;
  },

  async searchByCategory(query: string, category: string, limit: number, offset: number): Promise<DocumentSearchResult[]> {
    const result = await pool.query<DocumentSearchResult>(
      `SELECT kd.id AS "documentId", kd.title, kd.category,
        (CASE WHEN kd.title ILIKE $1 THEN 70 ELSE 0 END
          + CASE WHEN kd.content ILIKE $1 THEN 25 ELSE 0 END
          + CASE WHEN kd.category ILIKE $1 THEN 5 ELSE 0 END)::float AS score,
        kd.updated_at AS "updatedAt"
       FROM knowledge_documents kd
       WHERE lower(kd.category) = lower($2)
         AND (kd.title ILIKE $1 OR kd.content ILIKE $1 OR EXISTS (
           SELECT 1 FROM unnest(kd.tags) tag WHERE tag ILIKE $1
         ))
       ORDER BY score DESC, kd.updated_at DESC LIMIT $3 OFFSET $4`,
      [`%${query}%`, category, limit, offset]
    );
    return result.rows;
  },

  async getById(id: string, incrementAccess = false): Promise<KnowledgeDocument | null> {
    if (incrementAccess) {
      const result = await pool.query<KnowledgeDocument>(
        `UPDATE knowledge_documents SET access_count = access_count + 1
         WHERE id = $1 RETURNING id, title, content, category, tags, source_url, author, version, created_at, updated_at, access_count::float AS access_count`,
        [id]
      );
      return result.rows[0] ?? null;
    }
    const result = await pool.query<KnowledgeDocument>(
      `SELECT id, title, content, category, tags, source_url, author, version, created_at, updated_at, access_count::float AS access_count
       FROM knowledge_documents WHERE id = $1`,
      [id]
    );
    return result.rows[0] ?? null;
  },

  async getMetadata(id: string): Promise<DocumentMetadata | null> {
    const result = await pool.query<DocumentMetadata>(
      `SELECT author, version, created_at AS "createdAt", tags, source_url AS source
       FROM knowledge_documents WHERE id = $1`, [id]
    );
    return result.rows[0] ?? null;
  },

  async list(kind: "recent" | "popular", limit: number, offset: number, category?: string): Promise<DocumentListResult[]> {
    const orderBy = kind === "recent" ? "kd.created_at DESC" : "kd.access_count DESC, kd.updated_at DESC";
    const result = await pool.query<DocumentListResult>(
      `SELECT kd.id AS "documentId", kd.title, kd.category,
        kd.access_count::float AS "accessCount", kd.created_at AS "createdAt",
        kd.updated_at AS "updatedAt"
       FROM knowledge_documents kd
       WHERE ($1::text IS NULL OR lower(kd.category) = lower($1))
       ORDER BY ${orderBy} LIMIT $2 OFFSET $3`,
      [category ?? null, limit, offset]
    );
    return result.rows;
  },

  async semanticSearch(vector: number[], limit: number, offset: number, category?: string): Promise<DocumentSearchResult[]> {
    const vectorValue = vectorLiteral(vector);
    const candidateLimit = Math.min(10_000, Math.max(100, (offset + limit) * 20));
    const result = await pool.query<DocumentSearchResult>(
      `WITH nearest_chunks AS (
        SELECT dc.document_id, dc.embedding <=> $1::vector AS distance
        FROM document_chunks dc
        JOIN knowledge_documents kd ON kd.id = dc.document_id
        WHERE ($2::text IS NULL OR lower(kd.category) = lower($2))
        ORDER BY dc.embedding <=> $1::vector
        LIMIT $4
      ), ranked AS (
        SELECT kd.id, kd.title, kd.category, kd.updated_at, MIN(nc.distance) AS distance
        FROM nearest_chunks nc
        JOIN knowledge_documents kd ON kd.id = nc.document_id
        GROUP BY kd.id, kd.title, kd.category, kd.updated_at
       )
       SELECT id AS "documentId", title, category,
         (1 - distance)::float AS score, updated_at AS "updatedAt"
       FROM ranked
       WHERE (1 - distance) >= $3
       ORDER BY distance ASC LIMIT $5 OFFSET $6`,
      [vectorValue, category ?? null, config.SEMANTIC_SIMILARITY_THRESHOLD, candidateLimit, limit, offset]
    );
    return result.rows;
  },

  async findRelated(id: string, limit: number): Promise<DocumentSearchResult[]> {
    const result = await pool.query<DocumentSearchResult>(
      `WITH source_embedding AS (
         SELECT embedding FROM knowledge_embeddings WHERE document_id = $1
       ), nearest_chunks AS (
         SELECT dc.document_id, dc.embedding <=> se.embedding AS distance
         FROM source_embedding se
         CROSS JOIN document_chunks dc
         WHERE dc.document_id <> $1
         ORDER BY dc.embedding <=> se.embedding
         LIMIT 1000
       ), ranked AS (
         SELECT kd.id, kd.title, kd.category, kd.updated_at, MIN(nc.distance) AS distance
         FROM nearest_chunks nc
         JOIN knowledge_documents kd ON kd.id = nc.document_id
         GROUP BY kd.id, kd.title, kd.category, kd.updated_at
       )
       SELECT id AS "documentId", title, category, (1 - distance)::float AS score,
         updated_at AS "updatedAt"
       FROM ranked ORDER BY distance ASC LIMIT $2`,
      [id, limit]
    );
    return result.rows;
  },

  async saveWithEmbeddings(input: IngestDocumentInput, documentVector: number[], chunks: Array<{ content: string; embedding: number[] }>): Promise<string> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const documentId = await this.saveDocument(client, input);
      await client.query(
        `INSERT INTO knowledge_embeddings (document_id, embedding) VALUES ($1, $2::vector)
         ON CONFLICT (document_id) DO UPDATE SET embedding = EXCLUDED.embedding, updated_at = now()`,
        [documentId, vectorLiteral(documentVector)]
      );
      await client.query("DELETE FROM document_chunks WHERE document_id = $1", [documentId]);
      for (let index = 0; index < chunks.length; index += 1) {
        const chunk = chunks[index];
        if (!chunk) continue;
        await client.query(
          "INSERT INTO document_chunks (document_id, chunk_index, chunk_content, embedding) VALUES ($1, $2, $3, $4::vector)",
          [documentId, index, chunk.content, vectorLiteral(chunk.embedding)]
        );
      }
      await client.query("COMMIT");
      return documentId;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  async saveDocument(client: PoolClient, input: IngestDocumentInput): Promise<string> {
    if (input.documentId) {
      const result = await client.query<{ id: string }>(
        `UPDATE knowledge_documents SET title = $2, content = $3, category = $4, tags = $5,
          source_url = $6, author = $7, version = $8, updated_at = now()
         WHERE id = $1 RETURNING id`,
        [input.documentId, input.title, input.content, input.category, input.tags ?? [],
          input.sourceUrl ?? null, input.author ?? null, input.version ?? null]
      );
      if (result.rowCount === 0) throw new Error(`Document not found: ${input.documentId}`);
      return result.rows[0]!.id;
    }
    const result = await client.query<{ id: string }>(
      `INSERT INTO knowledge_documents (title, content, category, tags, source_url, author, version)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [input.title, input.content, input.category, input.tags ?? [], input.sourceUrl ?? null, input.author ?? null, input.version ?? null]
    );
    return result.rows[0]!.id;
  }
};
