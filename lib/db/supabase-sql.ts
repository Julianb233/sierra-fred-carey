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
 * Supports ON CONFLICT ... DO UPDATE (upsert) and ON CONFLICT ... DO NOTHING (idempotent insert)
 */
async function handleInsert(supabase: any, query: string, params: any[]) {
  // Parse: INSERT INTO table_name (columns) VALUES (values) [ON CONFLICT ...] [RETURNING ...]
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

  // Check for ON CONFLICT clause
  const onConflictDoNothingMatch = query.match(
    /ON\s+CONFLICT\s*\([^)]*\)\s+DO\s+NOTHING/i
  );
  const onConflictDoUpdateMatch = query.match(
    /ON\s+CONFLICT\s*\(([^)]+)\)\s+DO\s+UPDATE\s+SET\s+/i
  );

  let queryBuilder;

  if (onConflictDoNothingMatch) {
    // Idempotent insert: use ignoreDuplicates option
    // Supabase upsert with ignoreDuplicates skips conflicting rows silently
    const conflictColMatch = query.match(/ON\s+CONFLICT\s*\(([^)]+)\)/i);
    const conflictColumn = conflictColMatch
      ? conflictColMatch[1].trim()
      : undefined;

    queryBuilder = supabase
      .from(tableName)
      .upsert(data, {
        onConflict: conflictColumn,
        ignoreDuplicates: true,
      })
      .select();
  } else if (onConflictDoUpdateMatch) {
    // Upsert: ON CONFLICT (column) DO UPDATE SET ...
    const conflictColumn = onConflictDoUpdateMatch[1].trim();

    queryBuilder = supabase
      .from(tableName)
      .upsert(data, { onConflict: conflictColumn })
      .select();
  } else {
    // Plain insert (no ON CONFLICT)
    queryBuilder = supabase
      .from(tableName)
      .insert(data)
      .select();
  }

  const { data: result, error } = await queryBuilder;

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

  // Multi-step parsing for robustness
  // Step 1: Extract columns (everything between SELECT and FROM)
  const fromIndex = normalizedQuery.toUpperCase().indexOf(' FROM ');
  if (fromIndex === -1) {
    console.warn('[db] Could not find FROM in SELECT query:', normalizedQuery.substring(0, 100));
    return [];
  }

  const columns = normalizedQuery.substring(7, fromIndex).trim(); // 7 = length of "SELECT "
  let remainder = normalizedQuery.substring(fromIndex + 6).trim(); // 6 = length of " FROM "

  // Step 2: Extract table name (first word after FROM)
  const tableMatch = remainder.match(/^(\w+)/);
  if (!tableMatch) {
    console.warn('[db] Could not find table name in SELECT query:', normalizedQuery.substring(0, 100));
    return [];
  }
  const tableName = tableMatch[1];
  remainder = remainder.substring(tableName.length).trim();

  // Step 3: Extract WHERE, ORDER BY, LIMIT, OFFSET clauses
  let whereClause: string | undefined;
  let orderBy: string | undefined;
  let limit: string | undefined;
  let offset: string | undefined;

  // Find OFFSET first (at the very end or before LIMIT)
  const offsetMatch = remainder.match(/\s+OFFSET\s+(\$?\d+)\s*$/i);
  if (offsetMatch) {
    const offsetVal = offsetMatch[1];
    offset = offsetVal.startsWith('$') ? params[parseInt(offsetVal.substring(1)) - 1]?.toString() : offsetVal;
    remainder = remainder.substring(0, remainder.length - offsetMatch[0].length).trim();
  }

  // Find LIMIT (at the end after removing OFFSET)
  const limitMatch = remainder.match(/\s+LIMIT\s+(\$?\d+)\s*$/i);
  if (limitMatch) {
    const limitVal = limitMatch[1];
    limit = limitVal.startsWith('$') ? params[parseInt(limitVal.substring(1)) - 1]?.toString() : limitVal;
    remainder = remainder.substring(0, remainder.length - limitMatch[0].length).trim();
  }

  // Find ORDER BY
  const orderByIndex = remainder.toUpperCase().indexOf(' ORDER BY ');
  if (orderByIndex !== -1) {
    orderBy = remainder.substring(orderByIndex + 10).trim();
    remainder = remainder.substring(0, orderByIndex).trim();
  }

  // Find WHERE
  const whereIndex = remainder.toUpperCase().indexOf(' WHERE ');
  if (whereIndex !== -1) {
    whereClause = remainder.substring(whereIndex + 7).trim();
  } else if (remainder.toUpperCase().startsWith('WHERE ')) {
    whereClause = remainder.substring(6).trim();
  }

  // Parse columns and build alias map for transforming results
  // e.g., "max_tokens as \"maxTokens\"" -> { max_tokens: maxTokens }
  const aliasMap: Record<string, string> = {};
  const cleanColumns = columns
    .split(',')
    .map(col => {
      const trimmed = col.trim();
      // Match: column_name as "aliasName" or column_name as aliasName
      const aliasMatch = trimmed.match(/^(\w+)\s+as\s+"?(\w+)"?$/i);
      if (aliasMatch) {
        const [, colName, alias] = aliasMatch;
        aliasMap[colName] = alias;
        return colName;
      }
      return trimmed;
    })
    .join(',');

  let queryBuilder = supabase.from(tableName).select(cleanColumns === '*' ? '*' : cleanColumns);

  // Handle WHERE clause
  if (whereClause) {
    // Parse simple conditions: column = $1 AND column2 = $2 AND column3 = true
    const conditions = whereClause.split(/\s+AND\s+/i);

    for (const condition of conditions) {
      // Match parameterized conditions: column = $1
      const eqMatch = condition.match(/(\w+)\s*=\s*\$(\d+)/);
      if (eqMatch) {
        const [, column, pIdx] = eqMatch;
        const value = params[parseInt(pIdx) - 1];
        queryBuilder = queryBuilder.eq(column, value);
        continue;
      }

      // Match boolean literal conditions: column = true or column = false
      const boolMatch = condition.match(/(\w+)\s*=\s*(true|false)/i);
      if (boolMatch) {
        const [, column, boolValue] = boolMatch;
        queryBuilder = queryBuilder.eq(column, boolValue.toLowerCase() === 'true');
        continue;
      }

      // Match IS NULL conditions
      const isNullMatch = condition.match(/(\w+)\s+IS\s+NULL/i);
      if (isNullMatch) {
        queryBuilder = queryBuilder.is(isNullMatch[1], null);
        continue;
      }

      // Match IS NOT NULL conditions
      const isNotNullMatch = condition.match(/(\w+)\s+IS\s+NOT\s+NULL/i);
      if (isNotNullMatch) {
        queryBuilder = queryBuilder.not(isNotNullMatch[1], 'is', null);
        continue;
      }

      // Match COALESCE-style optional filter: ($1::text IS NULL OR column = $1)
      const coalesceFilterMatch = condition.match(/\(\s*\$(\d+)::(?:text|int|boolean)\s+IS\s+NULL\s+OR\s+(\w+)\s*=\s*\$\d+\s*\)/i);
      if (coalesceFilterMatch) {
        const [, pIdx, column] = coalesceFilterMatch;
        const value = params[parseInt(pIdx) - 1];
        if (value !== null && value !== undefined) {
          queryBuilder = queryBuilder.eq(column, value);
        }
        // If value is null, this is an optional filter -- skip it (match all)
        continue;
      }

      // Match comparison operators: column >= $1, column <= $1, column > $1, column < $1
      const cmpMatch = condition.match(/(\w+)\s*(>=|<=|>|<)\s*\$(\d+)/);
      if (cmpMatch) {
        const [, column, op, pIdx] = cmpMatch;
        const value = params[parseInt(pIdx) - 1];
        if (op === '>=') queryBuilder = queryBuilder.gte(column, value);
        else if (op === '<=') queryBuilder = queryBuilder.lte(column, value);
        else if (op === '>') queryBuilder = queryBuilder.gt(column, value);
        else if (op === '<') queryBuilder = queryBuilder.lt(column, value);
        continue;
      }
    }
  }

  // Handle ORDER BY - supports multiple columns, skips CASE expressions
  if (orderBy) {
    // Skip CASE ... END blocks for ordering (not supported by Supabase query builder)
    const cleanedOrderBy = orderBy.replace(/CASE\s+[\s\S]*?END/gi, '').trim();
    // Parse comma-separated order columns
    const orderParts = cleanedOrderBy.split(',').map(p => p.trim()).filter(Boolean);
    for (const part of orderParts) {
      const orderMatch = part.match(/(\w+)(?:\s+(ASC|DESC))?/i);
      if (orderMatch) {
        const [, column, direction] = orderMatch;
        if (column && column !== 'NULLS') {
          queryBuilder = queryBuilder.order(column, { ascending: direction?.toUpperCase() !== 'DESC' });
        }
      }
    }
  }

  // Handle LIMIT
  if (limit) {
    queryBuilder = queryBuilder.limit(parseInt(limit));
  }

  // Handle OFFSET via range
  if (offset && limit) {
    const offsetNum = parseInt(offset);
    const limitNum = parseInt(limit);
    queryBuilder = queryBuilder.range(offsetNum, offsetNum + limitNum - 1);
  }

  const { data, error } = await queryBuilder;

  if (error) {
    console.error(`[db] Select error on ${tableName}:`, error);
    throw error;
  }

  // Transform data to use aliased column names
  if (data && Object.keys(aliasMap).length > 0) {
    return data.map((row: Record<string, any>) => {
      const transformed: Record<string, any> = {};
      for (const [key, value] of Object.entries(row)) {
        const alias = aliasMap[key];
        transformed[alias || key] = value;
      }
      return transformed;
    });
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
    // Match parameterized: column = $1
    const setMatch = part.trim().match(/(\w+)\s*=\s*\$(\d+)/);
    if (setMatch) {
      const [, column, pIdx] = setMatch;
      data[column] = params[parseInt(pIdx) - 1];
      continue;
    }
    // Match boolean literal: column = true/false
    const boolMatch = part.trim().match(/(\w+)\s*=\s*(true|false)/i);
    if (boolMatch) {
      const [, column, boolValue] = boolMatch;
      data[column] = boolValue.toLowerCase() === 'true';
      continue;
    }
    // Match COALESCE pattern: column = COALESCE($1, column) — use param if not null
    const coalesceMatch = part.trim().match(/(\w+)\s*=\s*COALESCE\s*\(\s*\$(\d+)\s*,\s*\w+\s*\)/i);
    if (coalesceMatch) {
      const [, column, pIdx] = coalesceMatch;
      const value = params[parseInt(pIdx) - 1];
      if (value !== undefined && value !== null) {
        data[column] = value;
      }
      continue;
    }
    // Match NOW(): column = NOW()
    const nowMatch = part.trim().match(/(\w+)\s*=\s*NOW\(\)/i);
    if (nowMatch) {
      data[nowMatch[1]] = new Date().toISOString();
      continue;
    }
  }

  let queryBuilder = supabase.from(tableName).update(data);

  // Parse WHERE clause - handle ALL conditions (AND-separated)
  const whereConditions = whereClause.split(/\s+AND\s+/i);
  for (const condition of whereConditions) {
    // Match parameterized conditions: column = $1
    const eqMatch = condition.trim().match(/(\w+)\s*=\s*\$(\d+)/);
    if (eqMatch) {
      const [, column, pIdx] = eqMatch;
      queryBuilder = queryBuilder.eq(column, params[parseInt(pIdx) - 1]);
      continue;
    }
    // Match boolean literal conditions: column = true/false
    const boolMatch = condition.trim().match(/(\w+)\s*=\s*(true|false)/i);
    if (boolMatch) {
      const [, column, boolValue] = boolMatch;
      queryBuilder = queryBuilder.eq(column, boolValue.toLowerCase() === 'true');
      continue;
    }
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

  // Parse WHERE clause - handle ALL conditions (AND-separated)
  const whereConditions = whereClause.split(/\s+AND\s+/i);
  for (const condition of whereConditions) {
    const eqMatch = condition.trim().match(/(\w+)\s*=\s*\$(\d+)/);
    if (eqMatch) {
      const [, column, pIdx] = eqMatch;
      queryBuilder = queryBuilder.eq(column, params[parseInt(pIdx) - 1]);
      continue;
    }
    const boolMatch = condition.trim().match(/(\w+)\s*=\s*(true|false)/i);
    if (boolMatch) {
      const [, column, boolValue] = boolMatch;
      queryBuilder = queryBuilder.eq(column, boolValue.toLowerCase() === 'true');
      continue;
    }
  }

  const { data, error } = await queryBuilder.select();

  if (error) {
    console.error(`[db] Delete error on ${tableName}:`, error);
    throw error;
  }

  return data || [];
}

/**
 * Execute a raw parameterized SQL query with $1, $2, ... placeholders.
 * This bridges the gap for dynamic queries that build SQL strings with
 * positional parameters and a separate values array.
 */
async function executeSql(query: string, params: any[] = []): Promise<any[]> {
  const supabase = createServiceClient();
  const trimmed = query.trim().replace(/\s+/g, ' ').toUpperCase();

  try {
    if (trimmed.startsWith('INSERT')) {
      return await handleInsert(supabase, query, params);
    }
    if (trimmed.startsWith('SELECT')) {
      return await handleSelect(supabase, query, params);
    }
    if (trimmed.startsWith('UPDATE')) {
      return await handleUpdate(supabase, query, params);
    }
    if (trimmed.startsWith('DELETE')) {
      return await handleDelete(supabase, query, params);
    }

    console.warn('[db] Unsupported query type in execute:', trimmed.substring(0, 20));
    return [];
  } catch (e) {
    console.error('[db] Execute query error:', e);
    throw e;
  }
}

// Create the sql function with the unsafe and execute methods attached
interface SqlFunction {
  (strings: TemplateStringsArray, ...values: any[]): Promise<any>;
  unsafe(value: string): { __unsafeRaw: string };
  execute(query: string, params?: any[]): Promise<any[]>;
}

const sqlWithMethods = sqlQuery as SqlFunction;
sqlWithMethods.unsafe = unsafeSql;
sqlWithMethods.execute = executeSql;

export const sql: SqlFunction = sqlWithMethods;

// Helper to get a typed SQL client
export function getDb() {
  return sql;
}
