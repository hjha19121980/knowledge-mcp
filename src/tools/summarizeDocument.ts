import { summarizeDocumentSchema } from "../schemas/knowledgeSchemas.js";
import { documentRepository } from "../database/repositories/documentRepository.js";
import { summarizationService } from "../services/summarizationService.js";

export async function summarizeDocument(input: unknown) {
  const { documentId } = summarizeDocumentSchema.parse(input);
  const document = await documentRepository.getById(documentId);
  if (!document) throw new Error(`Document not found: ${documentId}`);
  return { summary: await summarizationService.summarize(document.content) };
}
