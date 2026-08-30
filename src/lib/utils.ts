import { SpendingCap } from './types'

export function formatSGD(amount: number): string {
  return `S$${amount.toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatMiles(miles: number): string {
  if (miles >= 1000) return `${(miles / 1000).toFixed(1)}k`
  return Math.round(miles).toString()
}

// Full miles with thousands separators (rounded) — the standard for lists/tiles.
// `formatMiles` stays the compact "1.2k" form for tight spots (charts, badges).
export function formatMilesFull(miles: number): string {
  return Math.round(miles).toLocaleString('en-SG')
}

export function formatMpd(mpd: number): string {
  return `${mpd.toFixed(2)} mpd`
}

export function getPeriodStart(
  period: SpendingCap['cap_period'],
  date: Date = new Date(),
  statementDay?: number
): Date {
  const d = new Date(date)
  switch (period) {
    case 'monthly': {
      const sDay = statementDay && statementDay > 1 ? statementDay : 1
      if (sDay === 1) return new Date(d.getFullYear(), d.getMonth(), 1)
      // Statement cycle: if today >= sDay, period started on sDay this month;
      // otherwise it started on sDay the previous month.
      return d.getDate() >= sDay
        ? new Date(d.getFullYear(), d.getMonth(), sDay)
        : new Date(d.getFullYear(), d.getMonth() - 1, sDay)
    }
    case 'quarterly': {
      const q = Math.floor(d.getMonth() / 3)
      return new Date(d.getFullYear(), q * 3, 1)
    }
    case 'annual':
      return new Date(d.getFullYear(), 0, 1)
    case 'per_transaction':
      return new Date(0) // handled separately
  }
}

export function getPeriodEnd(
  period: SpendingCap['cap_period'],
  date: Date = new Date(),
  statementDay?: number
): Date {
  const d = new Date(date)
  switch (period) {
    case 'monthly': {
      const sDay = statementDay && statementDay > 1 ? statementDay : null
      if (!sDay) return new Date(d.getFullYear(), d.getMonth() + 1, 0)
      // Period ends the day before the next statement date.
      return d.getDate() >= sDay
        ? new Date(d.getFullYear(), d.getMonth() + 1, sDay - 1)
        : new Date(d.getFullYear(), d.getMonth(), sDay - 1)
    }
    case 'quarterly': {
      const q = Math.floor(d.getMonth() / 3)
      return new Date(d.getFullYear(), (q + 1) * 3, 0)
    }
    case 'annual':
      return new Date(d.getFullYear(), 11, 31)
    case 'per_transaction':
      return d
  }
}

export function getPeriodLabel(period: SpendingCap['cap_period']): string {
  switch (period) {
    case 'monthly': return 'month'
    case 'quarterly': return 'quarter'
    case 'annual': return 'year'
    case 'per_transaction': return 'transaction'
  }
}

export function capPeriodLabel(period: SpendingCap['cap_period']): string {
  switch (period) {
    case 'monthly': return 'Monthly'
    case 'quarterly': return 'Quarterly'
    case 'annual': return 'Annual'
    case 'per_transaction': return 'Per Transaction'
  }
}

export function currentMonthLabel(): string {
  return new Date().toLocaleDateString('en-SG', { month: 'long', year: 'numeric' })
}

// Local YYYY-MM-DD. Must NOT use toISOString(), which converts to UTC and in
// SGT (UTC+8) shifts the date back ~8h — making e.g. the last day of a month or
// "today" resolve to the wrong calendar date for boundary comparisons.
export function isoDate(date: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`
}

export const CARD_NETWORKS = ['Visa', 'Mastercard', 'Amex', 'UnionPay']

export const CAP_PERIODS: SpendingCap['cap_period'][] = [
  'monthly', 'quarterly', 'annual', 'per_transaction',
]

export const PRESET_COLORS = [
  '#E31E35', '#C0162E', '#00427E', '#00854A',
  '#003882', '#BE1833', '#DB0011', '#F7A900',
  '#4F46E5', '#0891B2', '#059669', '#D97706',
  '#7C3AED', '#DB2777', '#374151',
]

export function exportCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]): void {
  const escape = (v: string | number | null | undefined): string => {
    const s = v == null ? '' : String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [headers, ...rows].map(row => row.map(escape).join(',')).join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
