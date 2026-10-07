import { describe, expect, it } from "vitest";
import {
  categorySearchSchema,
  getDocumentSchema,
  searchKnowledgeSchema,
  semanticSearchSchema
} from "../src/schemas/knowledgeSchemas.js";

describe("knowledge tool input schemas", () => {
  it("rejects blank queries and malformed document IDs", () => {
    expect(() => searchKnowledgeSchema.parse({ query: "  " })).toThrow();
    expect(() => semanticSearchSchema.parse({ query: "" })).toThrow();
    expect(() => getDocumentSchema.parse({ documentId: "123" })).toThrow();
  });

  it("applies bounded search defaults and rejects an empty category", () => {
    expect(searchKnowledgeSchema.parse({ query: "AKS" })).toMatchObject({ limit: 10, offset: 0, sort: "relevance" });
    expect(() => categorySearchSchema.parse({ category: " ", query: "OAuth" })).toThrow();
  });
});
