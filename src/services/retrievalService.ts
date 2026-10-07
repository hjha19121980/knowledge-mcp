import { categoryRepository } from "../database/repositories/categoryRepository.js";
import { documentRepository } from "../database/repositories/documentRepository.js";
import { embeddingService } from "./embeddingService.js";
import type { IngestDocumentInput, SearchOptions } from "../types/knowledgeTypes.js";
import { chunkText } from "../utils/chunking.js";

export { chunkText } from "../utils/chunking.js";

export class RetrievalService {
  async search(query: string, options: SearchOptions) {
    return documentRepository.search(query, options);
  }

  async semanticSearch(query: string, limit: number, offset: number, category?: string) {
    const vector = await embeddingService.embed(query);
    return documentRepository.semanticSearch(vector, limit, offset, category);
  }

  async getDocument(id: string) {
    return documentRepository.getById(id, true);
  }

  async searchCategory(category: string, query: string, limit: number, offset: number) {
    if (!(await categoryRepository.exists(category))) throw new Error(`Invalid category: ${category}`);
    return documentRepository.searchByCategory(query, category, limit, offset);
  }

  async ingest(input: IngestDocumentInput): Promise<string> {
    await categoryRepository.upsert(input.category);
    const chunks = chunkText(input.content);
    const [documentVector, ...chunkVectors] = await Promise.all([
      embeddingService.embed(input.content),
      ...chunks.map((chunk) => embeddingService.embed(chunk))
    ]);
    if (!documentVector) throw new Error("Document embedding was not generated");
    return documentRepository.saveWithEmbeddings(
      input,
      documentVector,
      chunks.map((content, index) => ({ content, embedding: chunkVectors[index]! }))
    );
  }
}

export const retrievalService = new RetrievalService();
