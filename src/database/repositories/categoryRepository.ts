import { pool } from "../postgres.js";

export interface KnowledgeCategory {
  category_id: string;
  category_name: string;
  description: string;
}

export const categoryRepository = {
  async exists(category: string): Promise<boolean> {
    const result = await pool.query("SELECT 1 FROM knowledge_categories WHERE lower(category_name) = lower($1)", [category]);
    return (result.rowCount ?? 0) > 0;
  },

  async upsert(category: string): Promise<void> {
    await pool.query(
      "INSERT INTO knowledge_categories (category_name) VALUES ($1) ON CONFLICT (category_name) DO NOTHING",
      [category]
    );
  }
};
