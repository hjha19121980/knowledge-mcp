import { z } from "zod";

const uuidSchema = z.string().uuid("documentId must be a valid UUID");
const querySchema = z.string().trim().min(1, "query must not be empty").max(2_000);

export const searchKnowledgeSchema = z.object({
  query: querySchema,
  limit: z.number().int().min(1).max(100).default(10),
  offset: z.number().int().min(0).max(100_000).default(0),
  category: z.string().trim().min(1).max(200).optional(),
  tags: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
  sort: z.enum(["relevance", "recent", "title"]).default("relevance")
});
export const getDocumentSchema = z.object({ documentId: uuidSchema });
export const semanticSearchSchema = z.object({
  query: querySchema,
  limit: z.number().int().min(1).max(50).default(10),
  offset: z.number().int().min(0).max(100_000).default(0),
  category: z.string().trim().min(1).max(200).optional()
});
export const summarizeDocumentSchema = z.object({ documentId: uuidSchema });
export const relatedDocumentsSchema = z.object({
  documentId: uuidSchema,
  limit: z.number().int().min(1).max(10).default(10)
});
export const categorySearchSchema = z.object({
  category: z.string().trim().min(1).max(200),
  query: querySchema,
  limit: z.number().int().min(1).max(100).default(10),
  offset: z.number().int().min(0).max(100_000).default(0)
});
export const recentDocumentsSchema = z.object({
  limit: z.number().int().min(1).max(100).default(10),
  offset: z.number().int().min(0).max(100_000).default(0),
  category: z.string().trim().min(1).max(200).optional()
});
export const popularDocumentsSchema = z.object({
  limit: z.number().int().min(1).max(100).default(10),
  offset: z.number().int().min(0).max(100_000).default(0),
  category: z.string().trim().min(1).max(200).optional()
});
export const documentMetadataSchema = z.object({ documentId: uuidSchema });
