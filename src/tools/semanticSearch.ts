import { semanticSearchSchema } from "../schemas/knowledgeSchemas.js";
import { retrievalService } from "../services/retrievalService.js";

export async function semanticSearch(input: unknown) {
  const args = semanticSearchSchema.parse(input);
  return retrievalService.semanticSearch(args.query, args.limit, args.offset, args.category);
}
