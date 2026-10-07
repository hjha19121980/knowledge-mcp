import { documentRepository } from "../database/repositories/documentRepository.js";

export class RecommendationService {
  findRelated(documentId: string, limit = 10) {
    return documentRepository.findRelated(documentId, limit);
  }
}

export const recommendationService = new RecommendationService();
