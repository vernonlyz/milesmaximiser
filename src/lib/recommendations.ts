import { CreditCard, CardRate, SpendingCap, Transaction, CardRecommendation } from './types'
import { getPeriodStart, formatSGD } from './utils'

/**
 * Given the full transaction history and a set of caps, compute how much
 * has already been spent per (card, category) for the relevant cap period.
 *
 * Returns a Map keyed by `${cardId}:${categoryId|'global'}`.
 */
export function buildPeriodSpending(
  transactions: Transaction[],
  caps: SpendingCap[],
  now: Date = new Date()
): Map<string, number> {
  const result = new Map<string, number>()

  for (const cap of caps) {
    if (cap.cap_period === 'per_transaction') continue

    const periodStart = getPeriodStart(cap.cap_period, now)
    const key = `${cap.card_id}:${cap.category_id ?? 'global'}`

    if (result.has(key)) continue // already computed

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

function getEffectiveForCard(
  card: CreditCard,
  rates: CardRate[],
  caps: SpendingCap[],
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
  const rateRow = rates.find(r => r.card_id === card.id && r.category_id === categoryId)
  const bonusMpd = rateRow?.mpd ?? card.base_mpd

  // Find most specific applicable cap (category-specific first, then global)
  const cap =
    caps.find(c => c.card_id === card.id && c.category_id === categoryId) ??
    caps.find(c => c.card_id === card.id && c.category_id === null)

  if (!cap) {
    return {
      effectiveMpd: bonusMpd,
      milesEarned: amount * bonusMpd,
      capRemaining: null,
      capAmount: null,
      capPeriod: null,
      status: bonusMpd === card.base_mpd ? 'base' : 'optimal',
    }
  }

  // Per-transaction cap: each transaction is evaluated independently
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

  // Split: partially in cap, rest falls to base rate
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

export function recommendCards(
  cards: CreditCard[],
  rates: CardRate[],
  caps: SpendingCap[],
  categoryId: string,
  amount: number,
  periodSpending: Map<string, number>
): CardRecommendation[] {
  if (!categoryId || amount <= 0) return []

  return cards
    .filter(c => c.active)
    .map(card => {
      const rateRow = rates.find(r => r.card_id === card.id && r.category_id === categoryId)
      const bonusMpd = rateRow?.mpd ?? card.base_mpd
      const eff = getEffectiveForCard(card, rates, caps, categoryId, amount, periodSpending)

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
        card,
        bonusMpd,
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
      // Tie-break: prefer cards closer to their cap (maximise miles earned from capped cards first)
      if (b.milesEarned !== a.milesEarned) return b.milesEarned - a.milesEarned
      return a.card.name.localeCompare(b.card.name)
    })
}

/** Compute miles for a single transaction given the card + category. */
export function calcMiles(
  card: CreditCard,
  rates: CardRate[],
  caps: SpendingCap[],
  categoryId: string,
  amount: number,
  periodSpending: Map<string, number>
): { miles: number; effectiveMpd: number } {
  const eff = getEffectiveForCard(card, rates, caps, categoryId, amount, periodSpending)
  return { miles: eff.milesEarned, effectiveMpd: eff.effectiveMpd }
}
