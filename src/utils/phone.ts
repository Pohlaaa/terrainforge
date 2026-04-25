/**
 * Format a US phone number string for display.
 *
 * - 10 digits → (xxx) xxx-xxxx
 * - 11 digits starting with 1 → +1 (xxx) xxx-xxxx
 * - Anything else → return as-is (don't mangle international or partial)
 */
export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return ''
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  return raw
}
