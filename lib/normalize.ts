// lib/normalize.ts
import crypto from 'crypto'

export function normalizeAmount(a: string | number): number {
  if (typeof a === 'number') return a
  // handle "($123.45)" or "-$123.45" or "$123.45"
  const neg = /\(|-\$?/.test(a)
  const cleaned = a.replace(/[^\d.]/g, '')
  const n = Number(cleaned || '0')
  return neg ? -Math.abs(n) : n
}

export function normalizeDescription(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

export function normalizeDateISO(s: string): string {
  // Expect MM/DD/YYYY or MM/DD/YY; return YYYY-MM-DD
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (!m) {
    const d = new Date(s)
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
    return s // leave as-is if we can’t parse; you’ll see it in preview
  }
  let [_, mm, dd, yy] = m
  if (yy.length === 2) yy = Number(yy) > 50 ? `19${yy}` : `20${yy}`
  const mm2 = mm.padStart(2, '0')
  const dd2 = dd.padStart(2, '0')
  return `${yy}-${mm2}-${dd2}`
}

export function fingerprint(obj: { date: string; amount: number; description: string; source: string }): string {
  const base = `${obj.date}|${obj.amount}|${obj.description}|${obj.source}`.toUpperCase()
  return crypto.createHash('sha256').update(base).digest('hex')
}
