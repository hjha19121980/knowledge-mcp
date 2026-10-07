export interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  source_url: string | null;
  author: string | null;
  version: string | null;
  created_at: Date;
  updated_at: Date;
  access_count: number;
}

export interface DocumentSearchResult {
  documentId: string;
  title: string;
  category: string;
  score: number;
  updatedAt: Date;
}

export interface DocumentListResult {
  documentId: string;
  title: string;
  category: string;
  accessCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SearchOptions {
  limit: number;
  offset: number;
  category?: string;
  tags?: string[];
  sort: "relevance" | "recent" | "title";
}

export interface IngestDocumentInput {
  title: string;
  content: string;
  category: string;
  tags?: string[];
  sourceUrl?: string;
  author?: string;
  version?: string;
  documentId?: string;
}

export interface DocumentMetadata {
  author: string | null;
  version: string | null;
  createdAt: Date;
  tags: string[];
  source: string | null;
}
