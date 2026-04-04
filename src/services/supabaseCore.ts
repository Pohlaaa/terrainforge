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

export function toCamelCase(obj: Record<string, unknown>): Record<string, unknown> {
  if (!obj) return obj
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())

    // Handle nested objects and arrays
    if (Array.isArray(value)) {
      result[camelKey] = value.map(item =>
        typeof item === 'object' && item !== null ? toCamelCase(item as Record<string, unknown>) : item
      )
    } else if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
      result[camelKey] = toCamelCase(value as Record<string, unknown>)
    } else {
      result[camelKey] = value
    }
  }

  return result
}

export function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  if (!obj) return obj
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)

    // Handle nested objects and arrays
    if (Array.isArray(value)) {
      result[snakeKey] = value.map(item =>
        typeof item === 'object' && item !== null ? toSnakeCase(item as Record<string, unknown>) : item
      )
    } else if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
      result[snakeKey] = toSnakeCase(value as Record<string, unknown>)
    } else {
      result[snakeKey] = value
    }
  }

  return result
}
