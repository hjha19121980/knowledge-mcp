import pg from "pg";
import { config } from "../utils/config.js";

const { Pool } = pg;
export const pool = new Pool({
  connectionString: config.DATABASE_URL,
  ssl: config.DATABASE_SSL ? { rejectUnauthorized: true } : false,
  max: 15,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000
});

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error", error);
});

export async function closeDatabase(): Promise<void> {
  await pool.end();
}
