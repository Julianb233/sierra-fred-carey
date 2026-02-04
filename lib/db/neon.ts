/**
 * Database client - Supabase native implementation
 *
 * Uses Supabase's native query methods for reliability.
 * Provides a sql template literal interface for compatibility.
 */

import { createServiceClient } from "@/lib/supabase/server";

/**
 * Helper for raw/unsafe SQL strings (used in dynamic queries)
 */
function unsafeSql(value: string): { __unsafeRaw: string } {
  return { __unsafeRaw: value };
}

/**
 * Parse SQL query and execute using Supabase's native methods
 */
async function sqlQuery(strings: TemplateStringsArray, ...values: any[]) {
  const supabase = createServiceClient();

  // Build the full query string for parsing
  let query = '';
  const params: any[] = [];

  strings.forEach((str, i) => {
    query += str;
    if (i < values.length) {
      const value = values[i];
      if (value && typeof value === 'object' && '__unsafeRaw' in value) {
        query += value.__unsafeRaw;
      } else {
        query += `$${params.length + 1}`;
        params.push(value);
      }
    }
  });

  const trimmedQuery = query.trim().toUpperCase();

  try {
    // Handle INSERT queries
    if (trimmedQuery.startsWith('INSERT')) {
      return await handleInsert(supabase, query, params);
    }

    // Handle SELECT queries
    if (trimmedQuery.startsWith('SELECT')) {
      return await handleSelect(supabase, query, params);
    }

    // Handle UPDATE queries
    if (trimmedQuery.startsWith('UPDATE')) {
      return await handleUpdate(supabase, query, params);
    }

    // Handle DELETE queries
    if (trimmedQuery.startsWith('DELETE')) {
      return await handleDelete(supabase, query, params);
    }

    // For other queries, log warning and return empty
    console.warn('[db] Unsupported query type:', trimmedQuery.substring(0, 20));
    return [];
  } catch (e) {
    console.error('[db] Query error:', e);
    throw e;
  }
}

/**
 * Handle INSERT queries using Supabase's insert method
 */
async function handleInsert(supabase: any, query: string, params: any[]) {
  // Parse: INSERT INTO table_name (columns) VALUES (values) RETURNING ...
  const insertMatch = query.match(
    /INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i
  );

  if (!insertMatch) {
    console.warn('[db] Could not parse INSERT query:', query.substring(0, 100));
    return [];
  }

  const [, tableName, columnsStr] = insertMatch;
  const columns = columnsStr.split(',').map(c => c.trim());

  // Build the data object
  const data: Record<string, any> = {};
  columns.forEach((col, i) => {
    data[col] = params[i];
  });

  const { data: result, error } = await supabase
    .from(tableName)
    .insert(data)
    .select();

  if (error) {
    console.error(`[db] Insert error on ${tableName}:`, error);
    throw error;
  }

  return result || [];
}

/**
 * Handle SELECT queries using Supabase's select method
 */
async function handleSelect(supabase: any, query: string, params: any[]) {
  // Normalize whitespace (collapse newlines and multiple spaces)
  const normalizedQuery = query.replace(/\s+/g, ' ').trim();

  // Parse: SELECT columns FROM table WHERE conditions
  const selectMatch = normalizedQuery.match(
    /SELECT\s+(.+?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER\s+BY\s+(.+?))?(?:\s+LIMIT\s+(\d+))?$/i
  );

  if (!selectMatch) {
    console.warn('[db] Could not parse SELECT query:', normalizedQuery.substring(0, 100));
    return [];
  }

  const [, columns, tableName, whereClause, orderBy, limit] = selectMatch;

  let queryBuilder = supabase.from(tableName).select(columns === '*' ? '*' : columns);

  // Handle WHERE clause
  if (whereClause) {
    // Parse simple conditions: column = $1 AND column2 = $2
    const conditions = whereClause.split(/\s+AND\s+/i);
    let paramIndex = 0;

    for (const condition of conditions) {
      const eqMatch = condition.match(/(\w+)\s*=\s*\$(\d+)/);
      if (eqMatch) {
        const [, column, pIdx] = eqMatch;
        const value = params[parseInt(pIdx) - 1];
        queryBuilder = queryBuilder.eq(column, value);
      }

      const isNullMatch = condition.match(/(\w+)\s+IS\s+NULL/i);
      if (isNullMatch) {
        queryBuilder = queryBuilder.is(isNullMatch[1], null);
      }

      const isNotNullMatch = condition.match(/(\w+)\s+IS\s+NOT\s+NULL/i);
      if (isNotNullMatch) {
        queryBuilder = queryBuilder.not(isNotNullMatch[1], 'is', null);
      }
    }
  }

  // Handle ORDER BY
  if (orderBy) {
    const orderMatch = orderBy.match(/(\w+)(?:\s+(ASC|DESC))?/i);
    if (orderMatch) {
      const [, column, direction] = orderMatch;
      queryBuilder = queryBuilder.order(column, { ascending: direction?.toUpperCase() !== 'DESC' });
    }
  }

  // Handle LIMIT
  if (limit) {
    queryBuilder = queryBuilder.limit(parseInt(limit));
  }

  const { data, error } = await queryBuilder;

  if (error) {
    console.error(`[db] Select error on ${tableName}:`, error);
    throw error;
  }

  return data || [];
}

/**
 * Handle UPDATE queries using Supabase's update method
 */
async function handleUpdate(supabase: any, query: string, params: any[]) {
  // Parse: UPDATE table SET column = value WHERE conditions
  const updateMatch = query.match(
    /UPDATE\s+(\w+)\s+SET\s+(.+?)\s+WHERE\s+(.+)/i
  );

  if (!updateMatch) {
    console.warn('[db] Could not parse UPDATE query:', query.substring(0, 100));
    return [];
  }

  const [, tableName, setClause, whereClause] = updateMatch;

  // Parse SET clause
  const data: Record<string, any> = {};
  const setParts = setClause.split(',');
  for (const part of setParts) {
    const setMatch = part.trim().match(/(\w+)\s*=\s*\$(\d+)/);
    if (setMatch) {
      const [, column, pIdx] = setMatch;
      data[column] = params[parseInt(pIdx) - 1];
    }
  }

  let queryBuilder = supabase.from(tableName).update(data);

  // Parse WHERE clause
  const eqMatch = whereClause.match(/(\w+)\s*=\s*\$(\d+)/);
  if (eqMatch) {
    const [, column, pIdx] = eqMatch;
    queryBuilder = queryBuilder.eq(column, params[parseInt(pIdx) - 1]);
  }

  const { data: result, error } = await queryBuilder.select();

  if (error) {
    console.error(`[db] Update error on ${tableName}:`, error);
    throw error;
  }

  return result || [];
}

/**
 * Handle DELETE queries using Supabase's delete method
 */
async function handleDelete(supabase: any, query: string, params: any[]) {
  // Parse: DELETE FROM table WHERE conditions
  const deleteMatch = query.match(
    /DELETE\s+FROM\s+(\w+)\s+WHERE\s+(.+)/i
  );

  if (!deleteMatch) {
    console.warn('[db] Could not parse DELETE query:', query.substring(0, 100));
    return [];
  }

  const [, tableName, whereClause] = deleteMatch;

  let queryBuilder = supabase.from(tableName).delete();

  // Parse WHERE clause
  const eqMatch = whereClause.match(/(\w+)\s*=\s*\$(\d+)/);
  if (eqMatch) {
    const [, column, pIdx] = eqMatch;
    queryBuilder = queryBuilder.eq(column, params[parseInt(pIdx) - 1]);
  }

  const { data, error } = await queryBuilder.select();

  if (error) {
    console.error(`[db] Delete error on ${tableName}:`, error);
    throw error;
  }

  return data || [];
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
