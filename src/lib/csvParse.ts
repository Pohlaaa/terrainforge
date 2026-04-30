/**
 * Minimal RFC 4180-compliant CSV parser.
 *
 * Replaces the prior regex-based parser in MaterialLibrary which:
 *   - couldn't handle quoted fields with embedded commas
 *     ("Hardscape, Pavers" was split into two fields)
 *   - couldn't handle escaped quotes ("She said ""hi""" was broken)
 *   - silently broke on Windows-line-ending CSVs that had embedded
 *     newlines inside quoted fields (jbluhm's "only imports 50 lines"
 *     symptom is consistent with a row past 50 having an embedded
 *     newline that shifted every subsequent line one position out)
 *
 * Pure + no deps — keeps the wizard chunk small. Handles:
 *   - quoted fields containing commas, newlines, escaped quotes
 *   - \r\n / \r / \n line endings interchangeably
 *   - leading / trailing whitespace inside quotes (preserved)
 *   - leading / trailing whitespace OUTSIDE quotes (trimmed)
 *   - trailing newline tolerated
 *   - empty trailing fields ("a,b," → ["a","b",""])
 *
 * Rejects malformed CSV (unterminated quote) by throwing — caller
 * surfaces this to the contractor with the row number.
 */

export interface CSVParseResult {
  headers: string[]
  rows: Array<Record<string, string>>
}

export class CSVParseError extends Error {
  constructor(message: string, public lineNumber: number) {
    super(`Line ${lineNumber}: ${message}`)
  }
}

/**
 * Parse a CSV string into headers + rows. The first non-empty line is
 * treated as the header row; everything after is data. Headers are
 * lowercased + trimmed for case-insensitive lookup at the call site.
 */
export function parseCSV(text: string): CSVParseResult {
  const records = tokenizeCSV(text)
  if (records.length === 0) return { headers: [], rows: [] }

  const headers = records[0].map((h) => h.trim().toLowerCase())
  const rows: Array<Record<string, string>> = []
  for (let i = 1; i < records.length; i++) {
    const fields = records[i]
    // Skip rows that are entirely empty (trailing newlines, etc.)
    if (fields.length === 0 || (fields.length === 1 && fields[0].trim() === '')) {
      continue
    }
    const obj: Record<string, string> = {}
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = (fields[j] ?? '').trim()
    }
    rows.push(obj)
  }
  return { headers, rows }
}

/**
 * Tokenize a CSV string into an array of records, each an array of
 * field strings. Internal — call `parseCSV` instead.
 */
function tokenizeCSV(text: string): string[][] {
  const records: string[][] = []
  let currentField = ''
  let currentRecord: string[] = []
  let inQuotes = false
  let lineNumber = 1

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const next = text[i + 1]

    if (inQuotes) {
      if (ch === '"') {
        if (next === '"') {
          // Escaped double quote.
          currentField += '"'
          i++
        } else {
          // End of quoted field.
          inQuotes = false
        }
      } else {
        currentField += ch
        if (ch === '\n') lineNumber++
      }
      continue
    }

    if (ch === '"') {
      inQuotes = true
      continue
    }

    if (ch === ',') {
      currentRecord.push(currentField)
      currentField = ''
      continue
    }

    if (ch === '\r' || ch === '\n') {
      // End of record. Treat \r\n as a single break.
      currentRecord.push(currentField)
      // Only push records that aren't completely empty (handles
      // trailing blank lines).
      if (currentRecord.length > 1 || currentRecord[0] !== '') {
        records.push(currentRecord)
      }
      currentRecord = []
      currentField = ''
      lineNumber++
      // Swallow the LF that follows CR.
      if (ch === '\r' && next === '\n') i++
      continue
    }

    currentField += ch
  }

  // Final record (no trailing newline).
  if (currentField !== '' || currentRecord.length > 0) {
    currentRecord.push(currentField)
    if (currentRecord.length > 1 || currentRecord[0] !== '') {
      records.push(currentRecord)
    }
  }

  if (inQuotes) {
    throw new CSVParseError(
      'unterminated quoted field — check for an unbalanced " in your file',
      lineNumber,
    )
  }

  return records
}
