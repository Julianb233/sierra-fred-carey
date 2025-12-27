import { neon } from "@neondatabase/serverless";

// Create a SQL client using the DATABASE_URL environment variable
export const sql = neon(process.env.DATABASE_URL!);

// Helper to get a typed SQL client
export function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  return sql;
}
