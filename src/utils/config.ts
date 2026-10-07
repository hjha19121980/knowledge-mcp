import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  DATABASE_URL: z.string({
    required_error: "DATABASE_URL is missing. Copy .env.example to .env and set the PostgreSQL connection string."
  }).url("DATABASE_URL must be a valid PostgreSQL connection URL."),
  DATABASE_SSL: z.string().default("false").transform((value) => value.toLowerCase() === "true"),
  EMBEDDING_PROVIDER: z.enum(["openai", "azure"]).default("openai"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),
  OPENAI_CHAT_MODEL: z.string().default("gpt-4o-mini"),
  AZURE_OPENAI_ENDPOINT: z.string().optional(),
  AZURE_OPENAI_API_KEY: z.string().optional(),
  AZURE_OPENAI_API_VERSION: z.string().default("2024-10-21"),
  AZURE_OPENAI_EMBEDDING_DEPLOYMENT: z.string().optional(),
  AZURE_OPENAI_CHAT_DEPLOYMENT: z.string().optional(),
  EMBEDDING_DIMENSIONS: z.coerce.number().int().positive().default(1536),
  SEMANTIC_SIMILARITY_THRESHOLD: z.coerce.number().min(0).max(1).default(0),
  PORT: z.coerce.number().int().positive().default(3000)
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
}

export const config = parsed.data;

export function assertEmbeddingConfiguration(): void {
  if (config.EMBEDDING_PROVIDER === "openai" && !config.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required when EMBEDDING_PROVIDER=openai");
  }
  if (config.EMBEDDING_PROVIDER === "azure" &&
      (!config.AZURE_OPENAI_ENDPOINT || !config.AZURE_OPENAI_API_KEY ||
       !config.AZURE_OPENAI_EMBEDDING_DEPLOYMENT)) {
    throw new Error("Azure endpoint, API key, and embedding deployment are required");
  }
}
