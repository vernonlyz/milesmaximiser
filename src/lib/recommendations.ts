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
// ─────────────────────────────────────────────────────────────────────────────

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
// Also computes total card spend per period for min_spend threshold checks.
// ─────────────────────────────────────────────────────────────────────────────

export function buildPeriodSpending(
  transactions: Transaction[],
  resolvedCaps: SpendingCap[],
  now: Date = new Date()
): Map<string, number> {
  const result = new Map<string, number>()

  for (const cap of resolvedCaps) {
    if (cap.cap_period === 'per_transaction') continue

    const periodStart = getPeriodStart(cap.cap_period, now)

    if (cap.cap_group) {
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

  // Compute total card spend per period for min_spend threshold checks.
  // Key: `${card_id}:total:${cap_period}` — all transactions on this card in the period.
  const seenTotalKeys = new Set<string>()
  for (const cap of resolvedCaps) {
    if (cap.min_spend == null || cap.cap_period === 'per_transaction') continue
    const totalKey = `${cap.card_id}:total:${cap.cap_period}`
    if (seenTotalKeys.has(totalKey)) continue
    seenTotalKeys.add(totalKey)
    const periodStart = getPeriodStart(cap.cap_period, now)
    const total = transactions
      .filter(t => t.card_id === cap.card_id && new Date(t.transaction_date) >= periodStart)
      .reduce((sum, t) => sum + t.amount, 0)
    result.set(totalKey, total)
  }

  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// Core effective-MPD calculation for one card on a specific date
// ─────────────────────────────────────────────────────────────────────────────

type EffResult = {
  effectiveMpd: number
  milesEarned: number
  capRemaining: number | null
  capAmount: number | null
  capPeriod: string | null
  status: CardRecommendation['status']
  minSpendRequired: number | null
  totalCardSpent: number | null
  requiredPaymentChannel: 'contactless' | 'online' | null
}

function getEffectiveForCard(
  card: CreditCard,
  resolvedRates: CardRate[],
  resolvedCaps: SpendingCap[],
  categoryId: string,
  amount: number,
  periodSpending: Map<string, number>,
  paymentChannel: 'contactless' | 'online' | null = null
): EffResult {
  const rateRow = resolvedRates.find(r => r.card_id === card.id && r.category_id === categoryId)
  const requiredChannel = rateRow?.payment_channel ?? null

  // When a filter is active and the rate requires a different channel, earn base rate only.
  const channelBlocked =
    requiredChannel !== null &&
    paymentChannel !== null &&
    requiredChannel !== paymentChannel

  const bonusMpd = (rateRow && !channelBlocked) ? rateRow.mpd : card.base_mpd

  const noCapResult = (status: CardRecommendation['status'] = bonusMpd === card.base_mpd ? 'base' : 'optimal'): EffResult => ({
    effectiveMpd: bonusMpd,
    milesEarned: amount * bonusMpd,
    capRemaining: null,
    capAmount: null,
    capPeriod: null,
    status,
    minSpendRequired: null,
    totalCardSpent: null,
    requiredPaymentChannel: requiredChannel,
  })

  if (channelBlocked) return noCapResult()

  const cap =
    resolvedCaps.find(c => c.card_id === card.id && c.category_id === categoryId) ??
    resolvedCaps.find(c => c.card_id === card.id && c.category_id === null)

  if (!cap || cap.spend_limit === null) return noCapResult()

  // Min spend threshold: check total card spend for the period before any bonus.
  if (cap.min_spend != null && cap.cap_period !== 'per_transaction') {
    const totalKey = `${cap.card_id}:total:${cap.cap_period}`
    const totalSpent = periodSpending.get(totalKey) ?? 0
    if (totalSpent < cap.min_spend) {
      return {
        effectiveMpd: card.base_mpd,
        milesEarned: amount * card.base_mpd,
        capRemaining: null,
        capAmount: cap.spend_limit,
        capPeriod: cap.cap_period,
        status: 'locked',
        minSpendRequired: cap.min_spend,
        totalCardSpent: totalSpent,
        requiredPaymentChannel: requiredChannel,
      }
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
      minSpendRequired: null,
      totalCardSpent: null,
      requiredPaymentChannel: requiredChannel,
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
      minSpendRequired: null,
      totalCardSpent: null,
      requiredPaymentChannel: requiredChannel,
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
      minSpendRequired: null,
      totalCardSpent: null,
      requiredPaymentChannel: requiredChannel,
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
    minSpendRequired: null,
    totalCardSpent: null,
    requiredPaymentChannel: requiredChannel,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export function recommendCards(
  cards: CreditCard[],
  allRates: CardRate[],
  allCaps: SpendingCap[],
  categoryId: string,
  amount: number,
  transactions: Transaction[],
  transactionDate: Date = new Date(),
  overrides: CategoryOverride[] = [],
  paymentChannel: 'contactless' | 'online' | null = null
): CardRecommendation[] {
  if (!categoryId || amount <= 0) return []

  let resolved = resolveRates(allRates, transactionDate)
  let resolvedCaps = resolveCaps(allCaps, transactionDate)

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
      const eff = getEffectiveForCard(card, resolved, resolvedCaps, categoryId, amount, periodSpending, paymentChannel)

      const channelNote = eff.requiredPaymentChannel === 'contactless' ? ' · tap to pay'
        : eff.requiredPaymentChannel === 'online' ? ' · online only'
        : ''

      let reason = ''
      switch (eff.status) {
        case 'optimal':
          reason = eff.capRemaining !== null
            ? `${bonusMpd} mpd · ${formatSGD(eff.capRemaining)} cap remaining${channelNote}`
            : `${bonusMpd} mpd · no cap${channelNote}`
          break
        case 'partial':
          reason = `${bonusMpd} mpd for first ${formatSGD(eff.capRemaining!)} · ${card.base_mpd} mpd after${channelNote}`
          break
        case 'capped':
          reason = `Cap reached · falls back to ${card.base_mpd} mpd base rate`
          break
        case 'base':
          if (
            eff.requiredPaymentChannel !== null &&
            paymentChannel !== null &&
            eff.requiredPaymentChannel !== paymentChannel
          ) {
            const channelLabel = eff.requiredPaymentChannel === 'contactless' ? 'tap to pay' : 'online purchase'
            reason = `${card.base_mpd} mpd base rate · ${bonusMpd} mpd needs ${channelLabel}`
          } else {
            reason = `${bonusMpd} mpd base rate (no category bonus)`
          }
          break
        case 'locked': {
          const needed = eff.minSpendRequired! - eff.totalCardSpent!
          const period = eff.capPeriod?.replace('ly', '') ?? 'month'
          reason = `Spend ${formatSGD(needed)} more this ${period} to unlock ${bonusMpd} mpd (need ${formatSGD(eff.minSpendRequired!)} total · ${formatSGD(eff.totalCardSpent!)} so far)${channelNote}`
          break
        }
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
        minSpendRequired: eff.minSpendRequired,
        totalCardSpent: eff.totalCardSpent,
        requiredPaymentChannel: eff.requiredPaymentChannel,
      } satisfies CardRecommendation
    })
    .sort((a, b) => {
      if (b.effectiveMpd !== a.effectiveMpd) return b.effectiveMpd - a.effectiveMpd
      if (b.milesEarned !== a.milesEarned) return b.milesEarned - a.milesEarned
      return a.card.name.localeCompare(b.card.name)
    })
}

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
