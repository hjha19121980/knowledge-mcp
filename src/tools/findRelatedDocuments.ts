import { relatedDocumentsSchema } from "../schemas/knowledgeSchemas.js";
import { documentRepository } from "../database/repositories/documentRepository.js";
import { recommendationService } from "../services/recommendationService.js";

export async function findRelatedDocuments(input: unknown) {
  const args = relatedDocumentsSchema.parse(input);
  if (!(await documentRepository.getById(args.documentId))) throw new Error(`Document not found: ${args.documentId}`);
  return recommendationService.findRelated(args.documentId, args.limit);
}
