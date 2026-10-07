import { documentRepository } from "../database/repositories/documentRepository.js";
import { documentMetadataSchema, popularDocumentsSchema, recentDocumentsSchema } from "../schemas/knowledgeSchemas.js";
import { getDocument } from "../tools/getDocument.js";
import { findRelatedDocuments } from "../tools/findRelatedDocuments.js";
import { searchByCategory } from "../tools/searchByCategory.js";
import { searchKnowledge } from "../tools/searchKnowledge.js";
import { semanticSearch } from "../tools/semanticSearch.js";
import { summarizeDocument } from "../tools/summarizeDocument.js";

type JsonSchema = { type: "object"; properties: Record<string, unknown>; required?: string[]; additionalProperties?: boolean };
type ToolDefinition = { name: string; description: string; inputSchema: JsonSchema };

const stringSchema = { type: "string" };
const integerSchema = { type: "integer", minimum: 1 };
const pagination = { limit: { ...integerSchema, maximum: 100, default: 10 }, offset: { type: "integer", minimum: 0, default: 0 } };

export const tools: ToolDefinition[] = [
  { name: "search_knowledge", description: "Search knowledge documents by keywords with filters, pagination, and sorting.", inputSchema: { type: "object", properties: { query: stringSchema, ...pagination, category: stringSchema, tags: { type: "array", items: stringSchema }, sort: { type: "string", enum: ["relevance", "recent", "title"] } }, required: ["query"], additionalProperties: false } },
  { name: "get_document", description: "Retrieve the complete content of a knowledge document.", inputSchema: { type: "object", properties: { documentId: stringSchema }, required: ["documentId"], additionalProperties: false } },
  { name: "semantic_search", description: "Find semantically similar knowledge using pgvector and query embeddings.", inputSchema: { type: "object", properties: { query: stringSchema, limit: { ...integerSchema, maximum: 50, default: 10 }, offset: pagination.offset, category: stringSchema }, required: ["query"], additionalProperties: false } },
  { name: "summarize_document", description: "Summarize a document with Purpose, Key Requirements, Important Guidelines, and Risks.", inputSchema: { type: "object", properties: { documentId: stringSchema }, required: ["documentId"], additionalProperties: false } },
  { name: "find_related_documents", description: "Return up to 10 documents related by vector similarity.", inputSchema: { type: "object", properties: { documentId: stringSchema, limit: { ...integerSchema, maximum: 10, default: 10 } }, required: ["documentId"], additionalProperties: false } },
  { name: "search_by_category", description: "Search documents within a valid knowledge category.", inputSchema: { type: "object", properties: { category: stringSchema, query: stringSchema, ...pagination }, required: ["category", "query"], additionalProperties: false } },
  { name: "recent_documents", description: "List recently added documents, optionally filtered by category.", inputSchema: { type: "object", properties: { ...pagination, category: stringSchema }, additionalProperties: false } },
  { name: "popular_documents", description: "List most accessed documents, optionally filtered by category.", inputSchema: { type: "object", properties: { ...pagination, category: stringSchema }, additionalProperties: false } },
  { name: "document_metadata", description: "Return author, version, creation date, tags, and source metadata.", inputSchema: { type: "object", properties: { documentId: stringSchema }, required: ["documentId"], additionalProperties: false } }
];

export const toolHandlers: Record<string, (input: unknown) => Promise<unknown>> = {
  search_knowledge: searchKnowledge,
  get_document: getDocument,
  semantic_search: semanticSearch,
  summarize_document: summarizeDocument,
  find_related_documents: findRelatedDocuments,
  search_by_category: searchByCategory,
  recent_documents: async (input) => {
    const args = recentDocumentsSchema.parse(input);
    return documentRepository.list("recent", args.limit, args.offset, args.category);
  },
  popular_documents: async (input) => {
    const args = popularDocumentsSchema.parse(input);
    return documentRepository.list("popular", args.limit, args.offset, args.category);
  },
  document_metadata: async (input) => {
    const { documentId } = documentMetadataSchema.parse(input);
    const metadata = await documentRepository.getMetadata(documentId);
    if (!metadata) throw new Error(`Document not found: ${documentId}`);
    return metadata;
  }
};
