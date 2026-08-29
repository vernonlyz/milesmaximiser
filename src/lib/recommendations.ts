import { CreditCard, CardRate, SpendingCap, Transaction, CardRecommendation, CategoryOverride, CardBoost, CardMccEligibility, Category } from './types'
import { getPeriodStart, getPeriodEnd, formatSGD, isoDate } from './utils'
import { resolveMccEligibility, chosenCategoryLabels } from './mcc'

// ─────────────────────────────────────────────────────────────────────────────
// Level-2 MCC gate (see docs/decision-log). When a CONFIRMED MCC is present and
// the card has an MCC model, the MCC — not the picked category — decides bonus vs
// base. Otherwise (no MCC, unconfirmed, no model, or an indecisive verdict) the
// engine falls back to the category-based path (Layer 2).
// ─────────────────────────────────────────────────────────────────────────────

// What the engine is told about the transaction's MCC. `confirmed` means "trusted
// enough to gate": true when the user typed the MCC or the vendor that supplied it
// is tagged 'confirmed' or 'likely'; false only for an 'unverified' vendor MCC.
export type MccContext = {
  code: string | null
  confirmed: boolean
  rows: CardMccEligibility[]   // all cards' eligibility rows (filtered per card here)
  categories: Category[]       // for resolving a selectable card's chosen labels
  categoryId?: string | null   // the MCC's mapped app category (mcc_catalogue.default_category_id),
                               // so a promoted MCC draws the right per-category cap
}

// The gate a confirmed MCC applies to a card:
//   'base'  → the card treats the MCC as INELIGIBLE → demote to base.
//   'bonus' → ELIGIBLE on a whitelist/hybrid card → earn the bonus even if the
//             picked category has no rate row (the resolver already enforced the
//             card's channel + chosen-category rules, so this can't over-earn).
//   null    → defer to the category engine (Layer 2): no/unconfirmed MCC, no card
//             model, an eligible BLACKLIST card (its wildcard/flat rate already
//             applies via the category path), or an indecisive verdict.
export function resolveMccGate(
  card: CreditCard,
  mcc: MccContext | undefined,
  overrides: CategoryOverride[],
  channel: 'contactless' | 'online' | 'chip' | null,
  date: Date,
): 'bonus' | 'base' | null {
  if (!mcc || !mcc.code || !mcc.confirmed || !card.mcc_mode) return null
  const cardRows = mcc.rows.filter(r => r.card_id === card.id)
  const chosen = chosenCategoryLabels(card, overrides, mcc.categories, date)
  const elig = resolveMccEligibility(card, mcc.code, cardRows, channel, chosen)
  if (elig.state === 'ineligible') return 'base'
  // Promote only whitelist/hybrid cards, whose bonus is a distinct rate. Blacklist
  // cards earn their normal (wildcard/flat) rate via the category path, so promoting
  // them would wrongly pick up a category-specific rate (e.g. a flat card's FCY rate).
  if (elig.state === 'eligible' && (card.mcc_mode === 'whitelist' || card.mcc_mode === 'hybrid')) return 'bonus'
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// Effective-date resolvers
// For a given date, return the single most-recent row per card+category.
// Rows with effective_from > date are ignored (future changes not yet in effect).
// ─────────────────────────────────────────────────────────────────────────────

export function resolveRates(allRates: CardRate[], date: Date = new Date()): CardRate[] {
  const dateStr = isoDate(date)
  const map = new Map<string, CardRate>()

  const eligible = [...allRates]
    .filter(r => r.effective_from <= dateStr)
    .sort((a, b) => a.effective_from.localeCompare(b.effective_from))

  for (const rate of eligible) {
    // Null-category wildcard rates are keyed by payment_channel to avoid
    // collisions when a card has both contactless and online wildcard rates.
    const key = rate.category_id === null
      ? `${rate.card_id}:wildcard:${rate.payment_channel ?? 'any'}`
      : `${rate.card_id}:${rate.category_id}`
    map.set(key, rate)
  }

  return Array.from(map.values())
}

export function resolveCaps(allCaps: SpendingCap[], date: Date = new Date()): SpendingCap[] {
  const dateStr = isoDate(date)
  const map = new Map<string, SpendingCap>()

  const eligible = [...allCaps]
    .filter(c => c.effective_from <= dateStr)
    .sort((a, b) => a.effective_from.localeCompare(b.effective_from))

  for (const cap of eligible) {
    // Channel caps (cap_payment_channel set) get a distinct key so they don't
    // collide with regular global caps (category_id null, no channel filter).
    const key = cap.cap_payment_channel
      ? `${cap.card_id}:channel:${cap.cap_payment_channel}:${cap.cap_period}`
      : `${cap.card_id}:${cap.category_id ?? 'global'}:${cap.cap_period}`
    map.set(key, cap)
  }

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
  const dateStr = isoDate(date)
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
  // Only look at category-specific rates for selectable-card templates
  // (wildcard null-category rates are not used as templates).
  const templateRate = resolvedRates.find(r => r.card_id === cardId && r.category_id !== null)
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

// Resolve whether a card's rate boost is active on a date: the most recent dated
// toggle with effective_from <= date. No rows → off.
export function resolveBoost(boosts: CardBoost[], cardId: string, date: Date = new Date()): boolean {
  const dateStr = isoDate(date)
  const rows = boosts
    .filter(b => b.card_id === cardId && b.effective_from <= dateStr)
    .sort((a, b) => b.effective_from.localeCompare(a.effective_from))
  return rows[0]?.enabled ?? false
}

// Raise a card's bonus-category rates to its boost rate when the boost is active
// (e.g. UOB Lady's Solitaire + Lady's Savings Account → 6 mpd). Only bonus rows
// (category set, above base) are raised; caps are untouched.
// Boost state resolves by `date` when `boosts` is given (effective-dated); otherwise
// it falls back to the card's precomputed `rate_boost` flag.
export function applyRateBoosts(
  cards: CreditCard[],
  resolvedRates: CardRate[],
  boosts?: CardBoost[],
  date: Date = new Date()
): CardRate[] {
  const boost = new Map<string, { mpd: number; base: number }>()
  for (const c of cards) {
    if (c.boost_mpd == null) continue
    const on = boosts ? resolveBoost(boosts, c.id, date) : !!c.rate_boost
    if (on) boost.set(c.id, { mpd: c.boost_mpd, base: c.base_mpd })
  }
  if (boost.size === 0) return resolvedRates
  return resolvedRates.map(r => {
    const b = boost.get(r.card_id)
    return b && r.category_id !== null && r.mpd > b.base ? { ...r, mpd: b.mpd } : r
  })
}

// Raise a card's monthly bonus cap to its boosted cap when the boost is active
// (e.g. HSBC Revolution + Everyday Global Account → S$1,200 combined bonus cap).
// Mirrors applyRateBoosts: resolves by `date` when `boosts` is given, else falls
// back to the card's precomputed `rate_boost` flag. Only monthly caps with a real
// spend_limit are raised.
export function applyCapBoosts(
  cards: CreditCard[],
  resolvedCaps: SpendingCap[],
  boosts?: CardBoost[],
  date: Date = new Date()
): SpendingCap[] {
  const boosted = new Map<string, number>()
  for (const c of cards) {
    if (c.boost_cap == null) continue
    const on = boosts ? resolveBoost(boosts, c.id, date) : !!c.rate_boost
    if (on) boosted.set(c.id, c.boost_cap)
  }
  if (boosted.size === 0) return resolvedCaps
  return resolvedCaps.map(cap => {
    const bc = boosted.get(cap.card_id)
    return bc != null && cap.spend_limit != null && cap.cap_period === 'monthly'
      ? { ...cap, spend_limit: bc }
      : cap
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Period spending
// Sums actual spend for each (card, category) combination within the cap period.
// Also computes total card spend and channel-filtered spend for cap tracking.
// ─────────────────────────────────────────────────────────────────────────────

export function buildPeriodSpending(
  transactions: Transaction[],
  resolvedCaps: SpendingCap[],
  now: Date = new Date(),
  statementDays: Map<string, number> = new Map(),
  // When provided (card id → base mpd), a bonus cap counts a transaction by whether
  // it actually EARNED bonus (effective_mpd > base) rather than by its category —
  // so MCC-eligible spend consumes the cap and MCC-ineligible spend does not
  // (Level-2). Omitted → category-based counting (unchanged / tests).
  baseMpdByCard?: Map<string, number>
): Map<string, number> {
  const result = new Map<string, number>()

  // Payment channels that have a dedicated channel cap, per card. A transaction
  // matching one of these is attributed to that channel cap (mirroring the engine,
  // where a channel cap takes precedence) and must NOT also be counted toward a
  // category/group cap on the same card — otherwise the same spend is double-counted
  // (e.g. an online-shopping purchase tagged contactless hitting both bars).
  const channelByCard = new Map<string, Set<string>>()
  for (const cap of resolvedCaps) {
    if (!cap.cap_payment_channel) continue
    const set = channelByCard.get(cap.card_id) ?? new Set<string>()
    set.add(cap.cap_payment_channel)
    channelByCard.set(cap.card_id, set)
  }
  const countedByChannelCap = (t: Transaction): boolean =>
    t.payment_channel != null && (channelByCard.get(t.card_id ?? '')?.has(t.payment_channel) ?? false)

  for (const cap of resolvedCaps) {
    if (cap.cap_period === 'per_transaction') continue

    const statDay = statementDays.get(cap.card_id)
    const startStr = isoDate(getPeriodStart(cap.cap_period, now, statDay))
    const endStr   = isoDate(getPeriodEnd(cap.cap_period, now, statDay))

    // MCC-aware counting: a transaction consumes a bonus cap when it actually earned
    // the bonus (its effective rate beat base). This reflects the MCC gate + channel
    // + category decision made at log time, so it needs no re-evaluation here.
    const baseMpd = baseMpdByCard?.get(cap.card_id)
    const mccAware = baseMpd != null
    const earnedBonus = (t: Transaction) => {
      const mpd = t.effective_mpd ?? t.computed_mpd
      return mpd != null && baseMpd != null && mpd > baseMpd
    }

    if (cap.cap_payment_channel) {
      // Channel cap: sum only transactions paid via the specified payment method,
      // regardless of category. Key: `${card_id}:channel:${channel}:${period}`.
      const channelKey = `${cap.card_id}:channel:${cap.cap_payment_channel}:${cap.cap_period}`
      if (result.has(channelKey)) continue
      const spent = transactions
        .filter(t => (
          t.card_id === cap.card_id &&
          t.payment_channel === cap.cap_payment_channel &&
          (!mccAware || earnedBonus(t)) &&
          t.transaction_date >= startStr && t.transaction_date <= endStr
        ))
        .reduce((sum, t) => sum + t.amount, 0)
      result.set(channelKey, spent)
    } else if (cap.cap_group) {
      const groupKey = `${cap.card_id}:group:${cap.cap_group}`
      if (result.has(groupKey)) continue

      const groupCatIds = resolvedCaps
        .filter(c => c.card_id === cap.card_id && c.cap_group === cap.cap_group && c.category_id !== null)
        .map(c => c.category_id as string)

      const spent = transactions
        .filter(t => (
          t.card_id === cap.card_id &&
          !countedByChannelCap(t) &&
          // MCC-aware: any bonus-earning spend draws from the pool (so a promoted
          // MCC under a non-group category counts, a demoted one doesn't). Else: by
          // the group's categories.
          (mccAware
            ? earnedBonus(t)
            : (t.category_id !== null && groupCatIds.includes(t.category_id))) &&
          t.transaction_date >= startStr && t.transaction_date <= endStr
        ))
        .reduce((sum, t) => sum + t.amount, 0)

      result.set(groupKey, spent)
    } else {
      const key = `${cap.card_id}:${cap.category_id ?? 'global'}`
      if (result.has(key)) continue

      const spent = transactions
        .filter(t => {
          if (t.card_id !== cap.card_id) return false
          if (cap.category_id !== null && t.category_id !== cap.category_id) return false
          if (countedByChannelCap(t)) return false
          if (mccAware && !earnedBonus(t)) return false
          return t.transaction_date >= startStr && t.transaction_date <= endStr
        })
        .reduce((sum, t) => sum + t.amount, 0)

      result.set(key, spent)
    }
  }

  // Compute total card spend per period for min_spend threshold checks.
  const seenTotalKeys = new Set<string>()
  for (const cap of resolvedCaps) {
    if (cap.min_spend == null || cap.cap_period === 'per_transaction') continue
    const totalKey = `${cap.card_id}:total:${cap.cap_period}`
    if (seenTotalKeys.has(totalKey)) continue
    seenTotalKeys.add(totalKey)
    const statDay = statementDays.get(cap.card_id)
    const startStr = isoDate(getPeriodStart(cap.cap_period, now, statDay))
    const endStr   = isoDate(getPeriodEnd(cap.cap_period, now, statDay))
    const total = transactions
      .filter(t => t.card_id === cap.card_id && t.transaction_date >= startStr && t.transaction_date <= endStr)
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
  paymentChannel: 'contactless' | 'online' | 'chip' | null = null,
  // Level-2 MCC gate: 'base' demotes (MCC ineligible), 'bonus' promotes to the
  // card's bonus rate (MCC eligible on a whitelist/hybrid card), null = normal path.
  mccGate: 'bonus' | 'base' | null = null,
  // The MCC's mapped app category — a promoted transaction draws this category's
  // cap first (so a per-category-cap card gets the right ceiling, not the pool fallback).
  mccCategoryId: string | null = null
): EffResult {
  // Category-specific rate for this card
  const categoryRateRow = resolvedRates.find(r => r.card_id === card.id && r.category_id === categoryId)

  // Wildcard rate (null category): applies to any category via a specific payment channel.
  // Only checked when the transaction has a real payment channel (not chip, which earns base).
  const wildcardRateRow = (paymentChannel === 'contactless' || paymentChannel === 'online')
    ? resolvedRates.find(r => r.card_id === card.id && r.category_id === null && r.payment_channel === paymentChannel)
    : null

  // Prefer the higher-earning applicable rate. Wildcard wins on tie (has specific channel info).
  const rateRow = wildcardRateRow && (!categoryRateRow || wildcardRateRow.mpd >= categoryRateRow.mpd)
    ? wildcardRateRow
    : (categoryRateRow ?? null)

  // Banks award miles on the amount rounded down to their earning block ($1 for HSBC/Citi, $5 for most).
  // Cap tracking always uses the real transaction amount; only miles calculations use milesAmount.
  const milesAmount = Math.floor(amount / card.earn_increment) * card.earn_increment

  // Level-2 MCC gate — 'base' DEMOTES the whole transaction to base (confirmed MCC
  // the card deems ineligible). This never bypasses the channel/cap rules below.
  if (mccGate === 'base') {
    return {
      effectiveMpd: amount > 0 ? (milesAmount * card.base_mpd) / amount : 0,
      milesEarned: milesAmount * card.base_mpd,
      capRemaining: null, capAmount: null, capPeriod: null,
      status: 'base', minSpendRequired: null, totalCardSpent: null,
      requiredPaymentChannel: null,
    }
  }

  // 'bonus' PROMOTES to the card's channel-applicable bonus rate even if the picked
  // category has no rate row (the resolver already enforced the card's channel +
  // chosen-category rules). Only whitelist/hybrid cards reach here (see resolveMccGate).
  const promoMpd = mccGate === 'bonus'
    ? resolvedRates
        .filter(r => r.card_id === card.id && (r.payment_channel == null || paymentChannel == null || r.payment_channel === paymentChannel))
        .reduce((m, r) => Math.max(m, r.mpd), card.base_mpd)
    : 0

  const requiredChannel = mccGate === 'bonus' ? null : (rateRow?.payment_channel ?? null)

  // When a payment filter is active and the rate requires a different channel, earn base rate.
  const channelBlocked =
    mccGate !== 'bonus' &&
    requiredChannel !== null &&
    paymentChannel !== null &&
    requiredChannel !== paymentChannel

  const bonusMpd = mccGate === 'bonus' ? promoMpd : ((rateRow && !channelBlocked) ? rateRow.mpd : card.base_mpd)

  const noCapResult = (status: CardRecommendation['status'] = bonusMpd === card.base_mpd ? 'base' : 'optimal'): EffResult => ({
    effectiveMpd: amount > 0 ? (milesAmount * bonusMpd) / amount : 0,
    milesEarned: milesAmount * bonusMpd,
    capRemaining: null,
    capAmount: null,
    capPeriod: null,
    status,
    minSpendRequired: null,
    totalCardSpent: null,
    requiredPaymentChannel: requiredChannel,
  })

  if (channelBlocked) return noCapResult()

  // Channel cap: when paying by a specific method, check if a channel-level cap applies.
  const channelCap = (paymentChannel === 'contactless' || paymentChannel === 'online')
    ? resolvedCaps.find(c => c.card_id === card.id && c.cap_payment_channel === paymentChannel)
    : null

  // Category/global cap (no channel filter)
  const nonChannelCap =
    resolvedCaps.find(c => c.card_id === card.id && c.category_id === categoryId && !c.cap_payment_channel) ??
    resolvedCaps.find(c => c.card_id === card.id && c.category_id === null && !c.cap_payment_channel)

  // Promotion cap selection. Prefer the MCC's own mapped-category cap (so Preferred's
  // online-shopping / Lady's dining etc. draw the correct $cap even when logged under a
  // different category), then the picked-category cap, then the combined pool, then any
  // non-channel cap.
  const mccCatCap = mccGate === 'bonus' && mccCategoryId
    ? resolvedCaps.find(c => c.card_id === card.id && c.category_id === mccCategoryId && !c.cap_payment_channel)
    : undefined
  const promoCap = mccGate === 'bonus'
    ? (resolvedCaps.find(c => c.card_id === card.id && c.cap_group && c.spend_limit != null)
       ?? resolvedCaps.find(c => c.card_id === card.id && c.spend_limit != null && !c.cap_payment_channel))
    : undefined

  // Channel cap takes precedence when the wildcard rate is the active rate
  const cap = (wildcardRateRow && channelCap) ? channelCap : (channelCap ?? mccCatCap ?? nonChannelCap ?? promoCap)

  if (!cap || cap.spend_limit === null) return noCapResult()

  // Min spend threshold: compute total period spend so it's available in all return paths
  const hasMindSpend = cap.min_spend != null && cap.cap_period !== 'per_transaction'
  const totalKey = hasMindSpend ? `${cap.card_id}:total:${cap.cap_period}` : null
  const totalSpent: number | null = totalKey ? (periodSpending.get(totalKey) ?? 0) : null

  if (hasMindSpend && totalSpent !== null && totalSpent < cap.min_spend!) {
    // Card is locked: also expose cap headroom so RecCard can render both bars
    const lockedSpentKey = cap.cap_payment_channel
      ? `${cap.card_id}:channel:${cap.cap_payment_channel}:${cap.cap_period}`
      : cap.cap_group
        ? `${cap.card_id}:group:${cap.cap_group}`
        : `${cap.card_id}:${cap.category_id ?? 'global'}`
    const alreadySpent = periodSpending.get(lockedSpentKey) ?? 0
    return {
      effectiveMpd: amount > 0 ? (milesAmount * card.base_mpd) / amount : 0,
      milesEarned: milesAmount * card.base_mpd,
      capRemaining: Math.max(0, cap.spend_limit - alreadySpent),
      capAmount: cap.spend_limit,
      capPeriod: cap.cap_period,
      status: 'locked',
      minSpendRequired: cap.min_spend,
      totalCardSpent: totalSpent,
      requiredPaymentChannel: requiredChannel,
    }
  }

  // Per-transaction cap
  if (cap.cap_period === 'per_transaction') {
    const eligible = Math.min(milesAmount, cap.spend_limit)
    const overflow = milesAmount - eligible
    const miles = eligible * bonusMpd + overflow * card.base_mpd
    return {
      effectiveMpd: amount > 0 ? miles / amount : 0,
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

  // Determine the spend key based on cap type
  const spentKey = cap.cap_payment_channel
    ? `${cap.card_id}:channel:${cap.cap_payment_channel}:${cap.cap_period}`
    : cap.cap_group
      ? `${cap.card_id}:group:${cap.cap_group}`
      : `${cap.card_id}:${cap.category_id ?? 'global'}`

  const alreadySpent = periodSpending.get(spentKey) ?? 0
  const remaining = cap.spend_limit - alreadySpent

  if (remaining <= 0) {
    return {
      effectiveMpd: amount > 0 ? (milesAmount * card.base_mpd) / amount : 0,
      milesEarned: milesAmount * card.base_mpd,
      capRemaining: 0,
      capAmount: cap.spend_limit,
      capPeriod: cap.cap_period,
      status: 'capped',
      minSpendRequired: cap.min_spend ?? null,
      totalCardSpent: totalSpent,
      requiredPaymentChannel: requiredChannel,
    }
  }

  if (amount <= remaining) {
    return {
      effectiveMpd: amount > 0 ? (milesAmount * bonusMpd) / amount : 0,
      milesEarned: milesAmount * bonusMpd,
      capRemaining: remaining,
      capAmount: cap.spend_limit,
      capPeriod: cap.cap_period,
      status: 'optimal',
      minSpendRequired: cap.min_spend ?? null,
      totalCardSpent: totalSpent,
      requiredPaymentChannel: requiredChannel,
    }
  }

  // Each tier is floored to the card's earn block independently: the bonus
  // applies to the cap remaining rounded down, and base to the leftover spend
  // (amount − cap remaining) rounded down. Partial blocks straddling the cap
  // boundary or the end of spend don't earn.
  const withinAmt = Math.floor(Math.min(amount, remaining) / card.earn_increment) * card.earn_increment
  const overAmt   = Math.floor(Math.max(0, amount - remaining) / card.earn_increment) * card.earn_increment
  const milesEarned = withinAmt * bonusMpd + overAmt * card.base_mpd
  return {
    effectiveMpd: amount > 0 ? milesEarned / amount : 0,
    milesEarned,
    capRemaining: remaining,
    capAmount: cap.spend_limit,
    capPeriod: cap.cap_period,
    status: 'partial',
    minSpendRequired: cap.min_spend ?? null,
    totalCardSpent: totalSpent,
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
  paymentChannel: 'contactless' | 'online' | 'chip' | null = null,
  statementDays: Map<string, number> = new Map(),
  boosts?: CardBoost[],
  mcc?: MccContext
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
  resolved = applyRateBoosts(cards, resolved, boosts, transactionDate)
  resolvedCaps = applyCapBoosts(cards, resolvedCaps, boosts, transactionDate)

  const periodSpending = buildPeriodSpending(transactions, resolvedCaps, transactionDate, statementDays, new Map(cards.map(c => [c.id, c.base_mpd])))

  return cards
    .filter(c => c.active)
    .map(card => {
      // Level-2 MCC gate for this card ('base' = demote, 'bonus' = promote to the
      // card's bonus rate, null = category-based, as before).
      const gate = resolveMccGate(card, mcc, overrides, paymentChannel, transactionDate)

      // Resolve the displayed "bonus mpd" for the reason string —
      // check wildcard rate first, then category rate, then base.
      const categoryRateRow = resolved.find(r => r.card_id === card.id && r.category_id === categoryId)
      const wildcardRateRow = (paymentChannel === 'contactless' || paymentChannel === 'online')
        ? resolved.find(r => r.card_id === card.id && r.category_id === null && r.payment_channel === paymentChannel)
        : null
      const promoMpd = resolved
        .filter(r => r.card_id === card.id && (r.payment_channel == null || paymentChannel == null || r.payment_channel === paymentChannel))
        .reduce((m, r) => Math.max(m, r.mpd), card.base_mpd)
      const bonusMpd =
        gate === 'base'  ? card.base_mpd
        : gate === 'bonus' ? promoMpd
        : (wildcardRateRow?.mpd ?? categoryRateRow?.mpd ?? card.base_mpd)

      const eff = getEffectiveForCard(card, resolved, resolvedCaps, categoryId, amount, periodSpending, paymentChannel, gate, mcc?.categoryId ?? null)

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
      const aSortMpd = a.status === 'locked' ? a.bonusMpd : a.effectiveMpd
      const bSortMpd = b.status === 'locked' ? b.bonusMpd : b.effectiveMpd
      if (bSortMpd !== aSortMpd) return bSortMpd - aSortMpd
      if (b.milesEarned !== a.milesEarned) return b.milesEarned - a.milesEarned
      return a.card.name.localeCompare(b.card.name)
    })
}

// Split a transaction's total earned miles into the base component (earned on all
// spend at the card's base rate) and the bonus component (everything above base,
// which caps/min-spend can reduce to zero). base + bonus === milesEarned exactly.
// Used for reconciling expected base vs bonus against what the bank credits.
export function splitBaseBonus(
  baseMpd: number,
  earnIncrement: number,
  amount: number,
  milesEarned: number
): { base: number; bonus: number } {
  const inc = earnIncrement || 1
  const rounded = Math.floor(amount / inc) * inc
  const base = rounded * baseMpd
  const bonus = Math.max(0, milesEarned - base)
  return { base, bonus }
}

export function calcMiles(
  card: CreditCard,
  allRates: CardRate[],
  allCaps: SpendingCap[],
  categoryId: string,
  amount: number,
  transactions: Transaction[],
  transactionDate: Date = new Date(),
  overrides: CategoryOverride[] = [],
  paymentChannel: 'contactless' | 'online' | 'chip' | null = null,
  statementDays: Map<string, number> = new Map(),
  boosts?: CardBoost[],
  mcc?: MccContext
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
  resolved = applyRateBoosts([card], resolved, boosts, transactionDate)
  resolvedCaps = applyCapBoosts([card], resolvedCaps, boosts, transactionDate)

  const gate = resolveMccGate(card, mcc, overrides, paymentChannel, transactionDate)
  const periodSpending = buildPeriodSpending(transactions, resolvedCaps, transactionDate, statementDays, new Map([[card.id, card.base_mpd]]))
  const eff = getEffectiveForCard(card, resolved, resolvedCaps, categoryId, amount, periodSpending, paymentChannel, gate, mcc?.categoryId ?? null)
  return { miles: eff.milesEarned, effectiveMpd: eff.effectiveMpd }
}
