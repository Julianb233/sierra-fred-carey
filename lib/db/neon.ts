/**
 * Database client - Supabase compatibility layer
 *
 * Previously used Neon, now migrated to Supabase.
 * This module provides a sql template literal compatible interface.
 */

import { createServiceClient } from "@/lib/supabase/server";

/**
 * Helper for raw/unsafe SQL strings (used in dynamic queries)
 * Returns the raw string value for interpolation
 */
function unsafeSql(value: string): { __unsafeRaw: string } {
  return { __unsafeRaw: value };
}

/**
 * Execute a raw SQL query using Supabase
 * Provides compatibility with the previous Neon sql`` template literal syntax
 */
async function sqlQuery(strings: TemplateStringsArray, ...values: any[]) {
  const supabase = createServiceClient();

  // Build the query string, handling unsafe raw values
  let query = '';
  let paramIndex = 1;
  const params: any[] = [];

  strings.forEach((str, i) => {
    query += str;
    if (i < values.length) {
      const value = values[i];
      // Check if this is an unsafe raw value
      if (value && typeof value === 'object' && '__unsafeRaw' in value) {
        query += value.__unsafeRaw;
      } else {
        query += `$${paramIndex}`;
        params.push(value);
        paramIndex++;
      }
    }
  });

  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      query_text: query,
      params: params
    });

    if (error) {
      // Fallback: try direct query if RPC not available
      console.warn('[db] RPC not available, using direct table access');
      throw error;
    }

    return data || [];
  } catch (e) {
    // For simple SELECT queries, parse and use Supabase query builder
    const selectMatch = query.match(/SELECT\s+(.+?)\s+FROM\s+(\w+)/i);
    if (selectMatch) {
      const [, columns, table] = selectMatch;
      const whereMatch = query.match(/WHERE\s+(.+?)(?:ORDER|LIMIT|$)/i);

      let queryBuilder = supabase.from(table).select(columns === '*' ? '*' : columns);

      // Handle simple WHERE clauses
      if (whereMatch) {
        const whereClause = whereMatch[1].trim();
        const eqMatch = whereClause.match(/(\w+)\s*=\s*\$(\d+)/);
        if (eqMatch) {
          const [, column, pIdx] = eqMatch;
          queryBuilder = queryBuilder.eq(column, params[parseInt(pIdx) - 1]);
        }
      }

      const { data, error: queryError } = await queryBuilder;
      if (queryError) throw queryError;
      return data || [];
    }

    console.error('[db] Query failed:', e);
    throw e;
  }
}

// Create the sql function with the unsafe method attached
type SqlFunction = {
  (strings: TemplateStringsArray, ...values: any[]): Promise<any>;
  unsafe: (value: string) => { __unsafeRaw: string };
};

export const sql: SqlFunction = Object.assign(sqlQuery, {
  unsafe: unsafeSql,
});

// Helper to get a typed SQL client
export function getDb() {
  return sql;
}
