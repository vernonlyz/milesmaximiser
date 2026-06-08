import { CreditCard, CardRate, SpendingCap, Transaction, CardRecommendation, CategoryOverride } from './types'
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
// Selectable-category overrides
// Cards like UOB Lady's Card let the holder choose their bonus category.
// The library stores one "bonus slot" row (Dining → 4mpd). When an override
// exists, the engine substitutes the chosen category into that slot so the
// rest of the logic runs unchanged. effective_from means old transactions
// resolve the override that was active at their date, preserving history.
// ─────────────────────────────────────────────────────────────────────────────

// Returns the active chosen category IDs for a selectable card as of `date`,
// or null if the user has not set an override (keep library default).
export function resolveOverride(
  overrides: CategoryOverride[],
  cardId: string,
  date: Date = new Date()
): string[] | null {
  const dateStr = date.toISOString().slice(0, 10)
  const eligible = overrides
    .filter(o => o.card_id === cardId && o.effective_from <= dateStr)
    .sort((a, b) => b.effective_from.localeCompare(a.effective_from))
  return eligible[0]?.category_ids ?? null
}

// Replaces the library's default bonus slot for a selectable card with the
// user's chosen category/categories. The template rate and cap are cloned
// with the new category_id; all other cards are left untouched.
export function applySelectableOverride(
  resolvedRates: CardRate[],
  resolvedCaps: SpendingCap[],
  cardId: string,
  chosenCategoryIds: string[]
): { rates: CardRate[]; caps: SpendingCap[] } {
  const templateRate = resolvedRates.find(r => r.card_id === cardId)
  const templateCap  = resolvedCaps.find(c => c.card_id === cardId && c.category_id !== null)

  const otherRates = resolvedRates.filter(r => r.card_id !== cardId)
  const otherCaps  = resolvedCaps.filter(c => c.card_id !== cardId)

  if (!templateRate) return { rates: resolvedRates, caps: resolvedCaps }

  const newRates = chosenCategoryIds.map(catId => ({
    ...templateRate,
    id: `${templateRate.id}:override:${catId}`,
    category_id: catId,
  }))
  const newCaps = templateCap
    ? chosenCategoryIds.map(catId => ({
        ...templateCap,
        id: `${templateCap.id}:override:${catId}`,
        category_id: catId,
      }))
    : []

  return { rates: [...otherRates, ...newRates], caps: [...otherCaps, ...newCaps] }
}

// Applies all per-user selectable overrides for every card in the wallet.
// Used by the Dashboard (and anywhere that needs substituted caps outside of recommendCards).
export function applyAllSelectableOverrides(
  cards: CreditCard[],
  resolvedRates: CardRate[],
  resolvedCaps: SpendingCap[],
  overrides: CategoryOverride[],
  date: Date = new Date()
): { rates: CardRate[]; caps: SpendingCap[] } {
  let rates = resolvedRates
  let caps = resolvedCaps
  for (const card of cards) {
    if (!card.selectable_category) continue
    const chosen = resolveOverride(overrides, card.id, date)
    if (!chosen) continue
    const applied = applySelectableOverride(rates, caps, card.id, chosen)
    rates = applied.rates
    caps = applied.caps
  }
  return { rates, caps }
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

    if (cap.cap_group) {
      // Combined cap: sum spending for ALL categories in this group
      const groupKey = `${cap.card_id}:group:${cap.cap_group}`
      if (result.has(groupKey)) continue

      const groupCatIds = resolvedCaps
        .filter(c => c.card_id === cap.card_id && c.cap_group === cap.cap_group && c.category_id !== null)
        .map(c => c.category_id as string)

      const spent = transactions
        .filter(t =>
          t.card_id === cap.card_id &&
          t.category_id !== null &&
          groupCatIds.includes(t.category_id) &&
          new Date(t.transaction_date) >= periodStart
        )
        .reduce((sum, t) => sum + t.amount, 0)

      result.set(groupKey, spent)
    } else {
      // Individual cap: sum spending for this specific category
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

  const spentKey = cap.cap_group
    ? `${cap.card_id}:group:${cap.cap_group}`
    : `${cap.card_id}:${cap.category_id ?? 'global'}`
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
  transactionDate: Date = new Date(),
  overrides: CategoryOverride[] = []
): CardRecommendation[] {
  if (!categoryId || amount <= 0) return []

  let resolved = resolveRates(allRates, transactionDate)
  let resolvedCaps = resolveCaps(allCaps, transactionDate)

  // Apply per-user selectable-category overrides before computing period spending.
  // For each selectable card with an active override, substitute the library's
  // default bonus slot with the user's chosen category/categories.
  for (const card of cards) {
    if (!card.selectable_category) continue
    const chosen = resolveOverride(overrides, card.id, transactionDate)
    if (!chosen) continue
    const applied = applySelectableOverride(resolved, resolvedCaps, card.id, chosen)
    resolved = applied.rates
    resolvedCaps = applied.caps
  }

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
  transactionDate: Date = new Date(),
  overrides: CategoryOverride[] = []
): { miles: number; effectiveMpd: number } {
  let resolved = resolveRates(allRates, transactionDate)
  let resolvedCaps = resolveCaps(allCaps, transactionDate)

  if (card.selectable_category) {
    const chosen = resolveOverride(overrides, card.id, transactionDate)
    if (chosen) {
      const applied = applySelectableOverride(resolved, resolvedCaps, card.id, chosen)
      resolved = applied.rates
      resolvedCaps = applied.caps
    }
  }

  const periodSpending = buildPeriodSpending(transactions, resolvedCaps, transactionDate)
  const eff = getEffectiveForCard(card, resolved, resolvedCaps, categoryId, amount, periodSpending)
  return { miles: eff.milesEarned, effectiveMpd: eff.effectiveMpd }
}
