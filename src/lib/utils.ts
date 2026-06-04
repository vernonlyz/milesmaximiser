import { SpendingCap } from './types'

export function formatSGD(amount: number): string {
  return `S$${amount.toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatMiles(miles: number): string {
  if (miles >= 1000) return `${(miles / 1000).toFixed(1)}k`
  return Math.round(miles).toString()
}

export function formatMpd(mpd: number): string {
  return `${mpd.toFixed(2)} mpd`
}

export function getPeriodStart(period: SpendingCap['cap_period'], date: Date = new Date()): Date {
  const d = new Date(date)
  switch (period) {
    case 'monthly':
      return new Date(d.getFullYear(), d.getMonth(), 1)
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

export function isoDate(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10)
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
