import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { resolve } from "path";

function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let inFunction = false;

  const lines = sql.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip comment-only lines
    if (trimmed.startsWith("--")) {
      continue;
    }

    // Track if we're inside a function definition
    if (trimmed.includes("$$")) {
      const dollarCount = (trimmed.match(/\$\$/g) || []).length;
      if (dollarCount === 1) {
        inFunction = !inFunction;
      }
    }

    current += line + "\n";

    // If we hit a semicolon and we're not in a function, it's the end of a statement
    if (trimmed.endsWith(";") && !inFunction) {
      const stmt = current.trim();
      if (stmt && !stmt.startsWith("--")) {
        statements.push(stmt);
      }
      current = "";
    }
  }

  // Add any remaining content
  if (current.trim()) {
    statements.push(current.trim());
  }

  return statements;
}

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  const sql = neon(databaseUrl);

  // Get migration file from command line argument or default
  const migrationFile =
    process.argv[2] || "lib/db/migrations/020_contact_submissions.sql";
  const migrationPath = resolve(process.cwd(), migrationFile);

  console.log(`Running migration: ${migrationFile}\n`);

  try {
    const migrationSQL = readFileSync(migrationPath, "utf-8");
    const statements = splitSqlStatements(migrationSQL);

    console.log(`Found ${statements.length} statements to execute\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const preview = statement.substring(0, 60).replace(/\n/g, " ");

      try {
        await sql.query(statement);
        console.log(`✓ [${i + 1}/${statements.length}] ${preview}...`);
      } catch (error: unknown) {
        const err = error as Error & { code?: string };
        // Ignore "already exists" errors
        if (
          err.message?.includes("already exists") ||
          err.message?.includes("duplicate key") ||
          err.code === "42710" || // duplicate_object
          err.code === "42P07" // duplicate_table
        ) {
          console.log(`⚠ [${i + 1}/${statements.length}] Skipped (already exists): ${preview}...`);
        } else {
          console.error(`\n❌ Failed at statement ${i + 1}:`);
          console.error(statement);
          throw error;
        }
      }
    }

    console.log("\n✅ Migration completed successfully!");
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
