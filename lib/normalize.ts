// lib/normalize.ts
import crypto from 'crypto'

/**
 * Normalizes a currency amount string or number into a pure number.
 * Handles formats like "($123.45)", "-$123.45", and "$123.45".
 */
export function normalizeAmount(a: string | number): number {
  if (typeof a === 'number') return a
  const neg = /\(|-\$?/.test(a)
  const cleaned = a.replace(/[^\d.]/g, '')
  const n = Number(cleaned || '0')
  return neg ? -Math.abs(n) : n
}

/**
 * Normalizes a description for clean display.
 */
export function normalizeDescription(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

/**
 * Aggressively normalizes a description specifically for creating a stable fingerprint.
 * - Converts to lowercase
 * - Collapses whitespace
 * - Removes transaction-specific noise like reference numbers or POS codes
 */
function normalizeDescriptionForFingerprint(s: string): string {
  // This regex is designed to be conservative but effective.
  // It removes common, highly volatile suffixes from transaction descriptions.
  const noise = /\s+(?:#\d+|ref|auth|pos|sq|-\s\w+)$/i
  
  return s
    .toLowerCase()
    .replace(noise, '') // Remove volatile noise from the end
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim()
}

/**
 * Normalizes a date string into ISO format (YYYY-MM-DD).
 * Handles MM/DD/YYYY and MM/DD/YY. Returns the original string if parsing fails.
 */
export function normalizeDateISO(s: string): string {
  // Expect MM/DD/YYYY or MM/DD/YY; return YYYY-MM-DD
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (!m) {
    try {
      // Attempt to parse more complex date formats
      const d = new Date(s)
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
    } catch (e) {
      // If Date constructor fails, return original string
      return s
    }
    return s
  }
  let [_, mm, dd, yy] = m
  if (yy.length === 2) yy = Number(yy) > 50 ? `19${yy}` : `20${yy}`
  const mm2 = mm.padStart(2, '0')
  const dd2 = dd.padStart(2, '0')
  return `${yy}-${mm2}-${dd2}`
}

/**
 * Creates a deterministic SHA256 fingerprint for a transaction.
 * This is the core of our deduplication strategy.
 * Formula: sha256(user_id|normalized_date|normalized_amount|normalized_description)
 */
export function createTransactionFingerprint(
  tx: { date: string; amount: number; description: string },
  userId: string,
): string {
  const normalizedDate = normalizeDateISO(tx.date)
  // Amount is rounded to 2 decimal places to avoid floating point inconsistencies
  const normalizedAmount = tx.amount.toFixed(2)
  const normalizedDesc = normalizeDescriptionForFingerprint(tx.description)
  // Using a separator to prevent collisions, e.g., amount '12' desc '3' vs. amount '1' desc '23'.
  const base = `${userId}|${normalizedDate}|${normalizedAmount}|${normalizedDesc}`.toUpperCase()
  return crypto.createHash('sha256').update(base).digest('hex')
}

/**
 * Creates a deterministic SHA256 fingerprint for a credit card transaction
 * that has a unique Reference Number. This is the most reliable method.
 * Formula: sha256(user_id|source_file_name|reference_number)
 */
export function createCreditCardTransactionFingerprint(
  tx: { referenceNumber: string },
  userId: string,
  sourceFileName: string,
): string {
  // We use the filename as part of the key to ensure that even if a bank somehow
  // re-used a reference number in a different statement month, it would still be unique.
  const base = `${userId}|${sourceFileName}|${tx.referenceNumber}`.toUpperCase();
  return crypto.createHash('sha256').update(base).digest('hex');
}