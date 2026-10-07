import { searchKnowledgeSchema } from "../schemas/knowledgeSchemas.js";
import { retrievalService } from "../services/retrievalService.js";
import type { SearchOptions } from "../types/knowledgeTypes.js";

export async function searchKnowledge(input: unknown) {
  const args = searchKnowledgeSchema.parse(input);
  const options: SearchOptions = {
    limit: args.limit, offset: args.offset, sort: args.sort,
    ...(args.category ? { category: args.category } : {}),
    ...(args.tags ? { tags: args.tags } : {})
  };
  return retrievalService.search(args.query, options);
}
