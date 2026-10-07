import { assertEmbeddingConfiguration, config } from "../utils/config.js";

export class EmbeddingService {
  async embed(text: string): Promise<number[]> {
    assertEmbeddingConfiguration();
    let endpoint: string;
    let headers: Record<string, string>;
    let body: Record<string, unknown>;

    if (config.EMBEDDING_PROVIDER === "azure") {
      endpoint = `${config.AZURE_OPENAI_ENDPOINT!.replace(/\/$/, "")}/openai/deployments/${encodeURIComponent(config.AZURE_OPENAI_EMBEDDING_DEPLOYMENT!)}/embeddings?api-version=${encodeURIComponent(config.AZURE_OPENAI_API_VERSION)}`;
      headers = { "api-key": config.AZURE_OPENAI_API_KEY!, "content-type": "application/json" };
      body = { input: text, dimensions: config.EMBEDDING_DIMENSIONS };
    } else {
      endpoint = "https://api.openai.com/v1/embeddings";
      headers = { authorization: `Bearer ${config.OPENAI_API_KEY!}`, "content-type": "application/json" };
      body = { model: config.OPENAI_EMBEDDING_MODEL, input: text, dimensions: config.EMBEDDING_DIMENSIONS };
    }
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000)
    });
    if (!response.ok) {
      throw new Error(`Embedding provider returned ${response.status}: ${(await response.text()).slice(0, 500)}`);
    }
    const payload: unknown = await response.json();
    if (typeof payload !== "object" || payload === null || !("data" in payload) || !Array.isArray(payload.data)) {
      throw new Error("Embedding provider returned an invalid response");
    }
    const row = payload.data[0] as { embedding?: unknown } | undefined;
    if (!row || !Array.isArray(row.embedding) || !row.embedding.every((value) => typeof value === "number" && Number.isFinite(value))) {
      throw new Error("Embedding provider returned an invalid embedding vector");
    }
    if (row.embedding.length !== config.EMBEDDING_DIMENSIONS) {
      throw new Error(`Embedding dimension mismatch: expected ${config.EMBEDDING_DIMENSIONS}, received ${row.embedding.length}`);
    }
    return row.embedding as number[];
  }
}

export const embeddingService = new EmbeddingService();
