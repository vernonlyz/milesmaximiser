import { describe, it, expect } from 'vitest'
import {
  resolveRates, resolveCaps, buildPeriodSpending, calcMiles, recommendCards, splitBaseBonus,
  MccContext,
} from './recommendations'
import { CreditCard, CardRate, SpendingCap, Transaction, CardMccEligibility } from './types'

// ── fixtures ──────────────────────────────────────────────────────────────
const DINING = 'cat-dining'
const GROCERY = 'cat-grocery'
const CARD = 'card-1'

function card(p: Partial<CreditCard> = {}): CreditCard {
  return {
    id: CARD, name: 'Test', bank: 'TestBank', card_network: 'Visa',
    base_mpd: 0.4, color: '#000', active: true,
    selectable_category: false, max_selectable: 1,
    mile_validity: null, remarks: null, default_payment_channel: null,
    cap_cycle: 'calendar', earn_increment: 5, card_type: 'miles', cashback_rate: null,
    created_at: '2000-01-01', ...p,
  }
}
function rate(p: Partial<CardRate> = {}): CardRate {
  return { id: `r-${Math.random()}`, card_id: CARD, category_id: DINING, mpd: 4, payment_channel: null, effective_from: '2000-01-01', ...p }
}
function cap(p: Partial<SpendingCap> = {}): SpendingCap {
  return {
    id: `c-${Math.random()}`, card_id: CARD, category_id: DINING, cap_period: 'monthly',
    spend_limit: 600, cap_group: null, min_spend: null, cap_payment_channel: null,
    effective_from: '2000-01-01', ...p,
  }
}
function txn(p: Partial<Transaction> = {}): Transaction {
  return {
    id: `t-${Math.random()}`, card_id: CARD, category_id: DINING, amount: 100,
    description: null, vendor_name: null, mcc: null, payment_channel: null,
    transaction_date: '2026-06-15', computed_mpd: null, manual_mpd: null, override_note: null,
    effective_mpd: null, miles_earned: null, cashback_earned: null, personal_amount: null,
    reconciled: false, created_at: '2026-06-15', ...p,
  }
}

const JUN = new Date(2026, 5, 15) // 15 Jun 2026, local

// ── resolvers ─────────────────────────────────────────────────────────────
describe('resolveRates', () => {
  it('picks the latest rate with effective_from <= date', () => {
    const rates = [
      rate({ mpd: 2, effective_from: '2024-01-01' }),
      rate({ mpd: 4, effective_from: '2025-06-01' }),
    ]
    const out = resolveRates(rates, JUN)
    expect(out).toHaveLength(1)
    expect(out[0].mpd).toBe(4)
  })

  it('ignores rates effective in the future', () => {
    const rates = [
      rate({ mpd: 2, effective_from: '2024-01-01' }),
      rate({ mpd: 8, effective_from: '2030-01-01' }),
    ]
    expect(resolveRates(rates, JUN)[0].mpd).toBe(2)
  })

  it('keeps wildcard rates separate per payment channel', () => {
    const rates = [
      rate({ category_id: null, payment_channel: 'online', mpd: 4 }),
      rate({ category_id: null, payment_channel: 'contactless', mpd: 4 }),
    ]
    expect(resolveRates(rates, JUN)).toHaveLength(2)
  })
})

describe('resolveCaps', () => {
  it('drops caps whose spend_limit is null (cap removed)', () => {
    const caps = [cap({ spend_limit: 600 }), cap({ category_id: GROCERY, spend_limit: null })]
    const out = resolveCaps(caps, JUN)
    expect(out).toHaveLength(1)
    expect(out[0].spend_limit).toBe(600)
  })
})

// ── period spending ───────────────────────────────────────────────────────
describe('buildPeriodSpending', () => {
  it('sums spend per category within the calendar month', () => {
    const caps = [cap()]
    const txns = [
      txn({ amount: 100, transaction_date: '2026-06-01' }),
      txn({ amount: 50,  transaction_date: '2026-06-20' }),
      txn({ amount: 999, transaction_date: '2026-05-31' }), // previous month — excluded
    ]
    const m = buildPeriodSpending(txns, caps, JUN)
    expect(m.get(`${CARD}:${DINING}`)).toBe(150)
  })

  it('includes a transaction dated on the last day of the month (SGT boundary)', () => {
    const caps = [cap()]
    const lastDay = new Date(2026, 5, 30) // 30 Jun
    const txns = [txn({ amount: 80, transaction_date: '2026-06-30' })]
    const m = buildPeriodSpending(txns, caps, lastDay)
    expect(m.get(`${CARD}:${DINING}`)).toBe(80)
  })

  it('channel cap only counts transactions on that channel', () => {
    const caps = [cap({ category_id: null, cap_payment_channel: 'online', spend_limit: 1000 })]
    const txns = [
      txn({ amount: 100, payment_channel: 'online' }),
      txn({ amount: 40,  payment_channel: 'contactless' }),
      txn({ amount: 30,  payment_channel: null }),
    ]
    const m = buildPeriodSpending(txns, caps, JUN)
    expect(m.get(`${CARD}:channel:online:monthly`)).toBe(100)
  })

  it('excludes channel-cap spend from the category cap (no double count)', () => {
    // Card has both an online channel cap and a dining category cap.
    const caps = [
      cap({ category_id: null, cap_payment_channel: 'online', spend_limit: 1000 }),
      cap({ category_id: DINING, spend_limit: 600 }),
    ]
    const txns = [txn({ category_id: DINING, amount: 100, payment_channel: 'online' })]
    const m = buildPeriodSpending(txns, caps, JUN)
    expect(m.get(`${CARD}:channel:online:monthly`)).toBe(100)
    expect(m.get(`${CARD}:${DINING}`) ?? 0).toBe(0) // not double-counted
  })
})

// ── calcMiles ─────────────────────────────────────────────────────────────
describe('calcMiles', () => {
  const rates = [rate({ mpd: 4 })]

  it('earns the bonus rate with no cap', () => {
    const c = card()
    const { miles, effectiveMpd } = calcMiles(c, rates, [], DINING, 100, [], JUN)
    expect(miles).toBe(400)
    expect(effectiveMpd).toBeCloseTo(4)
  })

  it('floors the amount to the earn block', () => {
    const { miles } = calcMiles(card({ earn_increment: 5 }), rates, [], DINING, 13.8, [], JUN)
    expect(miles).toBe(40) // floor(13.8/5)*5 = 10 → 10 * 4
  })

  it('earns the bonus on spend within the cap', () => {
    const { miles } = calcMiles(card(), rates, [cap({ spend_limit: 600 })], DINING, 200, [], JUN)
    expect(miles).toBe(800)
  })

  it('falls back to base rate once the cap is exhausted', () => {
    const prior = [txn({ amount: 600, transaction_date: '2026-06-05', effective_mpd: 4 })]
    const { miles } = calcMiles(card(), rates, [cap({ spend_limit: 600 })], DINING, 100, prior, JUN)
    expect(miles).toBe(40) // 100 * base 0.4
  })

  it('splits a partial-cap transaction, flooring each tier to the block', () => {
    // $577 already spent → $23 cap left. $200 spend, $5 block, 4 mpd bonus / 0.4 base.
    const prior = [txn({ amount: 577, transaction_date: '2026-06-05', effective_mpd: 4 })]
    const { miles } = calcMiles(card(), rates, [cap({ spend_limit: 600 })], DINING, 200, prior, JUN)
    // within = floor(23/5)*5 = 20 → 80 ; over = floor(177/5)*5 = 175 → 70
    expect(miles).toBe(150)
  })

  it('prefers the online wildcard rate over a lower category rate when paid online', () => {
    const mixed = [rate({ mpd: 2 }), rate({ category_id: null, payment_channel: 'online', mpd: 4 })]
    const online = calcMiles(card(), mixed, [], DINING, 100, [], JUN, [], 'online')
    expect(online.miles).toBe(400)
    const offline = calcMiles(card(), mixed, [], DINING, 100, [], JUN, [], null)
    expect(offline.miles).toBe(200) // only the category 2 mpd applies
  })

  it('earns base when the rate requires a different channel', () => {
    const contactlessOnly = [rate({ mpd: 4, payment_channel: 'contactless' })]
    const { miles } = calcMiles(card(), contactlessOnly, [], DINING, 100, [], JUN, [], 'online')
    expect(miles).toBe(40) // channel blocked → base 0.4
  })

  it('locks the bonus until the min-spend threshold is met', () => {
    const caps = [cap({ spend_limit: 600, min_spend: 1000 })]
    const { miles } = calcMiles(card(), rates, caps, DINING, 100, [], JUN)
    expect(miles).toBe(40) // total spend 0 < 1000 → locked → base
  })

  it('applies the rate boost to the bonus category when enabled', () => {
    const boosted = card({ boost_mpd: 6, rate_boost: true }) // 4 mpd → 6 mpd
    expect(calcMiles(boosted, rates, [], DINING, 100, [], JUN).miles).toBe(600)
    const off = card({ boost_mpd: 6, rate_boost: false })
    expect(calcMiles(off, rates, [], DINING, 100, [], JUN).miles).toBe(400)
  })

  it('resolves the boost by the transaction date when boost history is passed', () => {
    const c = card({ boost_mpd: 6 })
    const boosts = [{ id: 'b1', user_id: 'u', card_id: CARD, effective_from: '2026-06-10', enabled: true, created_at: '' }]
    // before the effective date → no boost (4 mpd)
    expect(calcMiles(c, rates, [], DINING, 100, [], new Date(2026, 5, 5), [], null, new Map(), boosts).miles).toBe(400)
    // on/after the effective date → boosted (6 mpd)
    expect(calcMiles(c, rates, [], DINING, 100, [], new Date(2026, 5, 15), [], null, new Map(), boosts).miles).toBe(600)
  })
})

// ── splitBaseBonus ────────────────────────────────────────────────────────
describe('splitBaseBonus', () => {
  it('splits a fully-bonused transaction into base + bonus', () => {
    // $100, base 0.4, inc 5, earned 400 (4 mpd) → base 40, bonus 360
    expect(splitBaseBonus(0.4, 5, 100, 400)).toEqual({ base: 40, bonus: 360 })
  })

  it('reports zero bonus when only the base rate was earned (capped/locked)', () => {
    expect(splitBaseBonus(0.4, 5, 100, 40)).toEqual({ base: 40, bonus: 0 })
  })

  it('matches the partial-cap split (base on all, bonus on the rest)', () => {
    // $200, base 0.4, inc 5, earned 150 (partial cap) → base 80, bonus 70
    expect(splitBaseBonus(0.4, 5, 200, 150)).toEqual({ base: 80, bonus: 70 })
  })

  it('base + bonus always equals the total', () => {
    const { base, bonus } = splitBaseBonus(1.2, 5, 87.4, 262)
    expect(base + bonus).toBe(262)
  })
})

// ── recommendCards ────────────────────────────────────────────────────────
describe('recommendCards', () => {
  it('ranks the higher effective-MPD card first and reports status', () => {
    const cardA = card({ id: 'A', base_mpd: 0.4 })
    const cardB = card({ id: 'B', base_mpd: 1.2 })
    const rates = [
      rate({ card_id: 'A', mpd: 4 }),  // A: 4 mpd dining
      rate({ card_id: 'B', mpd: 2 }),  // B: 2 mpd dining
    ]
    const recs = recommendCards([cardA, cardB], rates, [], DINING, 100, [], JUN)
    expect(recs[0].card.id).toBe('A')
    expect(recs[0].effectiveMpd).toBeCloseTo(4)
    expect(recs[0].status).toBe('optimal')
  })

  it('marks a card partial when the spend crosses its cap', () => {
    const c = card({ id: 'A' })
    const rates = [rate({ card_id: 'A', mpd: 4 })]
    const caps = [cap({ card_id: 'A', spend_limit: 600 })]
    const prior = [txn({ card_id: 'A', amount: 577, transaction_date: '2026-06-05', effective_mpd: 4 })]
    const recs = recommendCards([c], rates, caps, DINING, 200, prior, JUN)
    expect(recs[0].status).toBe('partial')
  })
})

// ── Level-2 MCC gate ────────────────────────────────────────────────────────
function eligRow(p: Partial<CardMccEligibility> = {}): CardMccEligibility {
  return {
    id: `e-${Math.random()}`, card_id: CARD, category_label: null,
    mcc_start: '5812', mcc_end: '5812', note: null, payment_channel: null,
    reduced: false, always_eligible: false, ...p,
  }
}
const mccCtx = (code: string, confirmed: boolean, rows: CardMccEligibility[]): MccContext =>
  ({ code, confirmed, rows, categories: [] })

describe('MCC gate (Level 2)', () => {
  const rates = [rate({ category_id: DINING, mpd: 4 })]
  const caps = [cap({ category_id: DINING, spend_limit: 600 })]

  it('confirmed MCC not in the whitelist demotes a bonus category to base', () => {
    const c = card({ mcc_mode: 'whitelist' })
    const rows = [eligRow({ mcc_start: '5812', mcc_end: '5812' })]
    // Category = DINING (bonus under Layer 2), but MCC 9999 is not whitelisted → base.
    const { effectiveMpd } = calcMiles(c, rates, caps, DINING, 100, [], JUN, [], null, undefined, undefined, mccCtx('9999', true, rows))
    expect(effectiveMpd).toBe(0.4)
  })

  it('confirmed eligible MCC leaves the category rate untouched (bonus on a bonus category)', () => {
    const c = card({ mcc_mode: 'whitelist' })
    const rows = [eligRow({ mcc_start: '5812', mcc_end: '5812' })]
    // Category DINING has a bonus rate and MCC 5812 is eligible → normal bonus, unchanged.
    const { effectiveMpd } = calcMiles(c, rates, caps, DINING, 100, [], JUN, [], null, undefined, undefined, mccCtx('5812', true, rows))
    expect(effectiveMpd).toBe(4)
  })

  it('whitelist: eligible MCC promotes a non-bonus category to the bonus rate', () => {
    const c = card({ mcc_mode: 'whitelist' })
    const rows = [eligRow({ mcc_start: '5651', mcc_end: '5651', category_label: 'Shop' })]
    // Category GROCERY has no rate row, but MCC 5651 is whitelisted → earns the 4 mpd bonus.
    const { effectiveMpd } = calcMiles(c, rates, caps, GROCERY, 100, [], JUN, [], null, undefined, undefined, mccCtx('5651', true, rows))
    expect(effectiveMpd).toBe(4)
  })

  it('promotion draws from the combined-pool cap (headroom applies)', () => {
    const c = card({ mcc_mode: 'whitelist' })
    const poolRates = [rate({ category_id: DINING, mpd: 4 })]
    const poolCaps = [cap({ category_id: DINING, spend_limit: 600, cap_group: 'bonus' })]
    const rows = [eligRow({ mcc_start: '5651', mcc_end: '5651' })]
    // $580 already in the pool; $100 more (eligible MCC, non-bonus category) → partial.
    const prior = [txn({ amount: 580, category_id: DINING, transaction_date: '2026-06-05', effective_mpd: 4 })]
    const rec = recommendCards([c], poolRates, poolCaps, GROCERY, 100, prior, JUN, [], null, new Map(), undefined, mccCtx('5651', true, rows))
    expect(rec[0].status).toBe('partial')
  })

  it('blacklist eligible does NOT promote (keeps the category/flat rate)', () => {
    // Flat blacklist card: only an FCY category rate exists; a local eligible MCC must
    // NOT be promoted to that FCY rate — it earns base.
    const c = card({ mcc_mode: 'blacklist', base_mpd: 1.4 })
    const flatRates = [rate({ category_id: GROCERY, mpd: 2.4 })] // e.g. FCY-only bonus
    const rows = [eligRow({ mcc_start: '6051', mcc_end: '6051' })] // 5812 not excluded
    const { effectiveMpd } = calcMiles(c, flatRates, [], DINING, 100, [], JUN, [], null, undefined, undefined, mccCtx('5812', true, rows))
    expect(effectiveMpd).toBe(1.4) // base, not the 2.4 category rate
  })

  it('an UNCONFIRMED MCC does not demote — falls back to the category (Layer 2)', () => {
    const c = card({ mcc_mode: 'whitelist' })
    const rows = [eligRow({ mcc_start: '5812', mcc_end: '5812' })]
    // MCC 9999 would demote if confirmed, but it is not → category DINING earns bonus.
    const { effectiveMpd } = calcMiles(c, rates, caps, DINING, 100, [], JUN, [], null, undefined, undefined, mccCtx('9999', false, rows))
    expect(effectiveMpd).toBe(4)
  })

  it('blacklist: excluded MCC → base; a non-excluded MCC keeps the category rate', () => {
    const c = card({ mcc_mode: 'blacklist' })
    const rows = [eligRow({ mcc_start: '6051', mcc_end: '6051' })]
    const excluded = calcMiles(c, rates, caps, DINING, 100, [], JUN, [], null, undefined, undefined, mccCtx('6051', true, rows))
    expect(excluded.effectiveMpd).toBe(0.4)
    const ok = calcMiles(c, rates, caps, DINING, 100, [], JUN, [], null, undefined, undefined, mccCtx('5812', true, rows))
    expect(ok.effectiveMpd).toBe(4)
  })

  it('cards with no MCC model ignore the gate (Layer 2)', () => {
    const c = card({ mcc_mode: null })
    const { effectiveMpd } = calcMiles(c, rates, caps, DINING, 100, [], JUN, [], null, undefined, undefined, mccCtx('9999', true, []))
    expect(effectiveMpd).toBe(4)
  })

  it('the gate never bypasses a channel rule: contactless on an online-only rate stays base', () => {
    // Online-only bonus rate (like DBS Woman\'s World). Eligible MCC, but paid contactless.
    const c = card({ mcc_mode: 'blacklist', bonus_channel: 'online' })
    const onlineRate = [rate({ category_id: null, payment_channel: 'online', mpd: 4 })]
    const rows = [eligRow({ mcc_start: '6051', mcc_end: '6051' })] // 5812 not excluded
    const contactless = calcMiles(c, onlineRate, [], DINING, 100, [], JUN, [], 'contactless', undefined, undefined, mccCtx('5812', true, rows))
    expect(contactless.effectiveMpd).toBe(0.4) // resolver ineligible off-channel → base
    const online = calcMiles(c, onlineRate, [], DINING, 100, [], JUN, [], 'online', undefined, undefined, mccCtx('5812', true, rows))
    expect(online.effectiveMpd).toBe(4)        // online wildcard applies
  })
})

// ── buildPeriodSpending — MCC-aware cap counting (base rates provided) ───────
describe('buildPeriodSpending (MCC-aware)', () => {
  const base = new Map([[CARD, 0.4]])

  it('pool cap counts bonus-earning spend of ANY category, ignoring demoted spend', () => {
    const caps = [
      cap({ category_id: DINING, spend_limit: 1000, cap_group: 'bonus' }),
      cap({ category_id: GROCERY, spend_limit: 1000, cap_group: 'bonus' }),
    ]
    const txns = [
      txn({ category_id: 'cat-other', amount: 100, effective_mpd: 4 }),  // promoted (non-group category) → counts
      txn({ category_id: DINING,      amount: 50,  effective_mpd: 0.4 }), // demoted (earned base) → excluded
      txn({ category_id: DINING,      amount: 30,  effective_mpd: 4 }),   // bonus dining → counts
    ]
    const m = buildPeriodSpending(txns, caps, JUN, new Map(), base)
    expect(m.get(`${CARD}:group:bonus`)).toBe(130)
  })

  it('channel cap counts only bonus-earning spend on that channel (DBS online-only)', () => {
    const caps = [cap({ category_id: null, cap_payment_channel: 'online', spend_limit: 1000 })]
    const txns = [
      txn({ payment_channel: 'online',      amount: 100, effective_mpd: 4 }),   // online bonus → counts
      txn({ payment_channel: 'online',      amount: 40,  effective_mpd: 0.4 }), // online but demoted → excluded
      txn({ payment_channel: 'contactless', amount: 30,  effective_mpd: 4 }),   // wrong channel → excluded
    ]
    const m = buildPeriodSpending(txns, caps, JUN, new Map(), base)
    expect(m.get(`${CARD}:channel:online:monthly`)).toBe(100)
  })

  it('without base rates, counting stays category-based (backward compatible)', () => {
    const caps = [cap({ category_id: DINING, spend_limit: 1000, cap_group: 'bonus' })]
    const txns = [txn({ category_id: DINING, amount: 50, effective_mpd: 0.4 })] // demoted, but no base map
    const m = buildPeriodSpending(txns, caps, JUN) // no baseMpdByCard
    expect(m.get(`${CARD}:group:bonus`)).toBe(50)   // counted by category
  })
})

describe('MCC gate — per-category cap attribution (1c)', () => {
  it('a promoted MCC draws its MAPPED category cap, not another category cap', () => {
    const A = 'cat-a', B = 'cat-b'
    const c = card({ mcc_mode: 'whitelist' })
    const rates = [rate({ category_id: A, mpd: 4 }), rate({ category_id: B, mpd: 4 })]
    const caps = [cap({ category_id: A, spend_limit: 50 }), cap({ category_id: B, spend_limit: 500 })]
    const rows: CardMccEligibility[] = [eligRow({ mcc_start: '5651', mcc_end: '5651' })]
    const ctx: MccContext = { code: '5651', confirmed: true, rows, categories: [], categoryId: A }
    // $40 already used in A → $10 left. Log $100 under an unrelated category with an
    // eligible MCC mapped to A: it should draw A's $50 cap (→ partial), not B's $500.
    const prior = [txn({ category_id: A, amount: 40, effective_mpd: 4 })]
    const rec = recommendCards([c], rates, caps, 'cat-other', 100, prior, JUN, [], null, new Map(), undefined, ctx)
    expect(rec[0].status).toBe('partial')
  })
})
