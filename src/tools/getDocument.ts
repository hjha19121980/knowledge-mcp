import { getDocumentSchema } from "../schemas/knowledgeSchemas.js";
import { documentRepository } from "../database/repositories/documentRepository.js";

export async function getDocument(input: unknown) {
  const { documentId } = getDocumentSchema.parse(input);
  const document = await documentRepository.getById(documentId, true);
  if (!document) throw new Error(`Document not found: ${documentId}`);
  return { documentId: document.id, title: document.title, content: document.content };
}
