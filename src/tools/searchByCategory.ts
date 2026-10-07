import { categorySearchSchema } from "../schemas/knowledgeSchemas.js";
import { retrievalService } from "../services/retrievalService.js";

export async function searchByCategory(input: unknown) {
  const args = categorySearchSchema.parse(input);
  return retrievalService.searchCategory(args.category, args.query, args.limit, args.offset);
}
