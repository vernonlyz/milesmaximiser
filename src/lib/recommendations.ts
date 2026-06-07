import { CreditCard, CardRate, SpendingCap, Transaction, CardRecommendation } from './types'
import { getPeriodStart, formatSGD } from './utils'

// ─────────────────────────────────────────────────────────────────────────────
// Effective-date resolvers
// For a given date, return the single most-recent row per card+category.
// Rows with effective_from > date are ignored (future changes not yet in effect).
// ─────────────────────────────────────────────────────────────────────────────

export function resolveRates(allRates: CardRate[], date: Date = new Date()): CardRate[] {
  const dateStr = date.toISOString().slice(0, 10)
  const map = new Map<string, CardRate>()

  // Sort ascending so later dates overwrite earlier ones in the map
  const eligible = [...allRates]
    .filter(r => r.effective_from <= dateStr)
    .sort((a, b) => a.effective_from.localeCompare(b.effective_from))

  for (const rate of eligible) {
    map.set(`${rate.card_id}:${rate.category_id}`, rate)
  }

  return Array.from(map.values())
}

export function resolveCaps(allCaps: SpendingCap[], date: Date = new Date()): SpendingCap[] {
  const dateStr = date.toISOString().slice(0, 10)
  const map = new Map<string, SpendingCap>()

  const eligible = [...allCaps]
    .filter(c => c.effective_from <= dateStr)
    .sort((a, b) => a.effective_from.localeCompare(b.effective_from))

  for (const cap of eligible) {
    const key = `${cap.card_id}:${cap.category_id ?? 'global'}:${cap.cap_period}`
    map.set(key, cap)
  }

  // Exclude caps that were explicitly removed (spend_limit = null)
  return Array.from(map.values()).filter(c => c.spend_limit !== null)
}

// ─────────────────────────────────────────────────────────────────────────────
// Period spending
// Sums actual spend for each (card, category) combination within the cap period.
// Uses the cap's effective_from to determine which period definition to use
// — so a quarterly cap is compared against quarterly totals, etc.
// ─────────────────────────────────────────────────────────────────────────────

export function buildPeriodSpending(
  transactions: Transaction[],
  resolvedCaps: SpendingCap[],   // already resolved for the target date
  now: Date = new Date()
): Map<string, number> {
  const result = new Map<string, number>()

  for (const cap of resolvedCaps) {
    if (cap.cap_period === 'per_transaction') continue

    const periodStart = getPeriodStart(cap.cap_period, now)
    const key = `${cap.card_id}:${cap.category_id ?? 'global'}`

    if (result.has(key)) continue

    const spent = transactions
      .filter(t => {
        if (t.card_id !== cap.card_id) return false
        if (cap.category_id !== null && t.category_id !== cap.category_id) return false
        return new Date(t.transaction_date) >= periodStart
      })
      .reduce((sum, t) => sum + t.amount, 0)

    result.set(key, spent)
  }

  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// Core effective-MPD calculation for one card on a specific date
// ─────────────────────────────────────────────────────────────────────────────

function getEffectiveForCard(
  card: CreditCard,
  resolvedRates: CardRate[],
  resolvedCaps: SpendingCap[],
  categoryId: string,
  amount: number,
  periodSpending: Map<string, number>
): {
  effectiveMpd: number
  milesEarned: number
  capRemaining: number | null
  capAmount: number | null
  capPeriod: string | null
  status: CardRecommendation['status']
} {
  const rateRow = resolvedRates.find(r => r.card_id === card.id && r.category_id === categoryId)
  const bonusMpd = rateRow?.mpd ?? card.base_mpd

  const cap =
    resolvedCaps.find(c => c.card_id === card.id && c.category_id === categoryId) ??
    resolvedCaps.find(c => c.card_id === card.id && c.category_id === null)

  if (!cap || cap.spend_limit === null) {
    return {
      effectiveMpd: bonusMpd,
      milesEarned: amount * bonusMpd,
      capRemaining: null,
      capAmount: null,
      capPeriod: null,
      status: bonusMpd === card.base_mpd ? 'base' : 'optimal',
    }
  }

  // Per-transaction cap
  if (cap.cap_period === 'per_transaction') {
    const eligible = Math.min(amount, cap.spend_limit)
    const overflow = amount - eligible
    const miles = eligible * bonusMpd + overflow * card.base_mpd
    return {
      effectiveMpd: miles / amount,
      milesEarned: miles,
      capRemaining: cap.spend_limit,
      capAmount: cap.spend_limit,
      capPeriod: cap.cap_period,
      status: overflow > 0 ? 'partial' : 'optimal',
    }
  }

  const spentKey = `${cap.card_id}:${cap.category_id ?? 'global'}`
  const alreadySpent = periodSpending.get(spentKey) ?? 0
  const remaining = cap.spend_limit - alreadySpent

  if (remaining <= 0) {
    return {
      effectiveMpd: card.base_mpd,
      milesEarned: amount * card.base_mpd,
      capRemaining: 0,
      capAmount: cap.spend_limit,
      capPeriod: cap.cap_period,
      status: 'capped',
    }
  }

  if (amount <= remaining) {
    return {
      effectiveMpd: bonusMpd,
      milesEarned: amount * bonusMpd,
      capRemaining: remaining,
      capAmount: cap.spend_limit,
      capPeriod: cap.cap_period,
      status: 'optimal',
    }
  }

  const bonusMiles = remaining * bonusMpd
  const baseMiles = (amount - remaining) * card.base_mpd
  const milesEarned = bonusMiles + baseMiles
  return {
    effectiveMpd: milesEarned / amount,
    milesEarned,
    capRemaining: remaining,
    capAmount: cap.spend_limit,
    capPeriod: cap.cap_period,
    status: 'partial',
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Rank all active cards for a given category, amount and transaction date.
 * Automatically resolves the effective rates and caps for that date.
 */
export function recommendCards(
  cards: CreditCard[],
  allRates: CardRate[],
  allCaps: SpendingCap[],
  categoryId: string,
  amount: number,
  transactions: Transaction[],
  transactionDate: Date = new Date()
): CardRecommendation[] {
  if (!categoryId || amount <= 0) return []

  const resolved = resolveRates(allRates, transactionDate)
  const resolvedCaps = resolveCaps(allCaps, transactionDate)
  const periodSpending = buildPeriodSpending(transactions, resolvedCaps, transactionDate)

  return cards
    .filter(c => c.active)
    .map(card => {
      const rateRow = resolved.find(r => r.card_id === card.id && r.category_id === categoryId)
      const bonusMpd = rateRow?.mpd ?? card.base_mpd
      const eff = getEffectiveForCard(card, resolved, resolvedCaps, categoryId, amount, periodSpending)

      let reason = ''
      switch (eff.status) {
        case 'optimal':
          reason = eff.capRemaining !== null
            ? `${bonusMpd} mpd · ${formatSGD(eff.capRemaining)} cap remaining`
            : `${bonusMpd} mpd · no cap`
          break
        case 'partial':
          reason = `${bonusMpd} mpd for first ${formatSGD(eff.capRemaining!)} · ${card.base_mpd} mpd after`
          break
        case 'capped':
          reason = `Cap reached · falls back to ${card.base_mpd} mpd base rate`
          break
        case 'base':
          reason = `${bonusMpd} mpd base rate (no category bonus)`
          break
      }

      return {
        card, bonusMpd,
        effectiveMpd: eff.effectiveMpd,
        milesEarned: eff.milesEarned,
        capRemaining: eff.capRemaining,
        capAmount: eff.capAmount,
        capPeriod: eff.capPeriod,
        status: eff.status,
        reason,
      } satisfies CardRecommendation
    })
    .sort((a, b) => {
      if (b.effectiveMpd !== a.effectiveMpd) return b.effectiveMpd - a.effectiveMpd
      if (b.milesEarned !== a.milesEarned) return b.milesEarned - a.milesEarned
      return a.card.name.localeCompare(b.card.name)
    })
}

/**
 * Calculate miles for a single transaction on a specific date.
 */
export function calcMiles(
  card: CreditCard,
  allRates: CardRate[],
  allCaps: SpendingCap[],
  categoryId: string,
  amount: number,
  transactions: Transaction[],
  transactionDate: Date = new Date()
): { miles: number; effectiveMpd: number } {
  const resolved = resolveRates(allRates, transactionDate)
  const resolvedCaps = resolveCaps(allCaps, transactionDate)
  const periodSpending = buildPeriodSpending(transactions, resolvedCaps, transactionDate)
  const eff = getEffectiveForCard(card, resolved, resolvedCaps, categoryId, amount, periodSpending)
  return { miles: eff.milesEarned, effectiveMpd: eff.effectiveMpd }
}
