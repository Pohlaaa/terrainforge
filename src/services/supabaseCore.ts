import type { } from '@/types'

// ===== ERROR REPORTING =====

type ErrorReporter = (operation: string, table: string, error: unknown) => void;
let errorReporter: ErrorReporter = (op, table, err) => {
  const e = err as Record<string, unknown> | null;
  console.error(`[TF-SUPABASE] ${op} on ${table} failed:`, e?.message || err, e?.details || '', e?.hint || '');
};

export function onSupabaseError(operation: string, table: string, error: unknown): void {
  errorReporter(operation, table, error);
}

export function setSupabaseErrorReporter(reporter: ErrorReporter) {
  errorReporter = reporter;
}

// ===== TIMESTAMP SANITIZATION =====

/** Replace empty-string values with null for timestamp/date columns to avoid Postgres 22007 errors */
export function sanitizeTimestamps(obj: Record<string, unknown>, fields: string[]): Record<string, unknown> {
  const cleaned = { ...obj };
  for (const field of fields) {
    if (cleaned[field] === '') cleaned[field] = null;
  }
  return cleaned;
}

// ===== CASE CONVERSION HELPERS =====

/**
 * Recursively convert plain-object keys snake_case → camelCase.
 *
 * Sprint AI-Buildable note: array elements that are themselves arrays
 * (e.g. `obstacles: Array<Array<{x, y}>>`) MUST recurse via this
 * function, not via `toCamelCase`, otherwise the inner array's
 * numeric indices get stringified into object keys ("0", "1", ...)
 * and the JSONB column gets a malformed object instead of an array.
 * `convertValue` is the shared dispatcher.
 */
function convertCamel(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(convertCamel)
  if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
    return toCamelCase(value as Record<string, unknown>)
  }
  return value
}

function convertSnake(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(convertSnake)
  if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
    return toSnakeCase(value as Record<string, unknown>)
  }
  return value
}

export function toCamelCase(obj: Record<string, unknown>): Record<string, unknown> {
  if (!obj) return obj
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
    result[camelKey] = convertCamel(value)
  }

  return result
}

export function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  if (!obj) return obj
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
    result[snakeKey] = convertSnake(value)
  }

  return result
}
