import { useEffect, useMemo, useState } from 'react'
import { ClipboardCheck, FlaskConical, Check, AlertTriangle } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { RewardProgram, CardRewardProgram, CreditReconciliation, CreditCard } from '../lib/types'
import { splitBaseBonus, resolveRates, resolveCaps, applyAllSelectableOverrides, resolveBoost } from '../lib/recommendations'
import MilesTabs from '../components/MilesTabs'

interface TxnRow { id: string; card_id: string | null; category_id: string | null; amount: number; miles_earned: number | null; vendor_name: string | null; transaction_date: string }
interface TxnRecon { transaction_id: string; base_reconciled: boolean }

// ── date helpers (local, string-based) ──────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, '0')
const monthKey = (d: string) => d.slice(0, 7)
const firstOf = (mk: string) => `${mk}-01`
function lastDayOf(mk: string) { const [y, m] = mk.split('-').map(Number); return `${mk}-${pad(new Date(y, m, 0).getDate())}` }
function firstOfNext(mk: string) { let [y, m] = mk.split('-').map(Number); m += 1; if (m > 12) { m = 1; y += 1 }; return `${y}-${pad(m)}-01` }
const fmtMonth = (mk: string) => new Date(firstOf(mk)).toLocaleDateString('en-SG', { month: 'short', year: 'numeric' })
const fmtDay = (d: string) => new Date(d).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
const fmtNum = (n: number) => Math.round(n).toLocaleString('en-SG')

// One transaction's expected split, in miles + (optional) program points.
interface Line { txn: TxnRow; catName: string | null; baseMi: number; bonusMi: number; basePt: number | null; bonusPt: number | null }
// A bonus lump as it appears on the statement.
interface BonusLump { key: string; card: CreditCard; kind: string; label: string; cycleMonth: string; categoryId: string | null; categoryName: string | null; creditDate: string; expectedMi: number; expectedPt: number | null; unit: string | null; count: number; capped: boolean; capMi: number | null; capPt: number | null }
interface Block { key: string; card: CreditCard; mk: string; prog: RewardProgram | null; lines: Line[]; lumps: BonusLump[] }

export default function Reconcile() {
  const { cards, categories, caps, rates, overrides, boosts } = useApp()
  const { user } = useAuth()

  const [txns, setTxns] = useState<TxnRow[]>([])
  const [programs, setPrograms] = useState<RewardProgram[]>([])
  const [mapping, setMapping] = useState<CardRewardProgram[]>([])
  const [bonusRecon, setBonusRecon] = useState<CreditReconciliation[]>([])
  const [txnRecon, setTxnRecon] = useState<TxnRecon[]>([])
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [filterCard, setFilterCard] = useState<string>('all')
  const [filterMonth, setFilterMonth] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'unreconciled' | 'mismatch'>('all')

  async function load() {
    setLoading(true)
    const [txRes, progRes, mapRes, bonusRes, tprRes] = await Promise.all([
      supabase.from('transactions').select('id, card_id, category_id, amount, miles_earned, vendor_name, transaction_date'),
      supabase.from('reward_programs').select('*'),
      supabase.from('card_reward_program').select('*'),
      supabase.from('credit_reconciliations').select('*').in('kind', ['bonus', 'bonus_boost']),
      supabase.from('transaction_point_recon').select('transaction_id, base_reconciled'),
    ])
    setTxns((txRes.data as TxnRow[]) ?? [])
    setPrograms((progRes.data as RewardProgram[]) ?? [])
    setMapping((mapRes.data as CardRewardProgram[]) ?? [])
    setBonusRecon((bonusRes.data as CreditReconciliation[]) ?? [])
    setTxnRecon((tprRes.data as TxnRecon[]) ?? [])
    setLoading(false)
  }
  useEffect(() => { if (user) load() }, [user])
  async function refetchBonus() { const { data } = await supabase.from('credit_reconciliations').select('*').in('kind', ['bonus', 'bonus_boost']); setBonusRecon((data as CreditReconciliation[]) ?? []) }
  async function refetchTxnRecon() { const { data } = await supabase.from('transaction_point_recon').select('transaction_id, base_reconciled'); setTxnRecon((data as TxnRecon[]) ?? []) }

  const cardById = useMemo(() => new Map(cards.map(c => [c.id, c])), [cards])
  const catById = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories])
  const progForCard = useMemo(() => {
    const m = new Map<string, RewardProgram>()
    for (const map of mapping) { const p = programs.find(pr => pr.id === map.program_id); if (p) m.set(map.card_id, p) }
    return m
  }, [mapping, programs])

  // Monthly cap that bounds a bonus bucket: the category cap (or group) for
  // by-category buckets, else a channel/global cap. Used to cap aggregate spend.
  function capForBucket(card: CreditCard, categoryId: string | null): number | null {
    const rel = caps.filter(c => c.card_id === card.id && c.spend_limit != null && c.cap_period === 'monthly'
      && (categoryId ? (c.category_id === categoryId || c.cap_group != null) : (c.cap_payment_channel != null || c.category_id == null)))
    return rel.length ? Math.min(...rel.map(c => c.spend_limit as number)) : null
  }

  // Bonus categories a card earns (with selectable override + boost applied) → the
  // per-$ bonus rate above base, AND the monthly spend cap bounding that category.
  // Resolving caps through the override matters for selectable cards: the raw cap
  // rows carry the template category, so a chosen non-default category would
  // otherwise find no cap and reconcile uncapped.
  function bonusInfoByCat(card: CreditCard, dateStr: string): Map<string, { baseDelta: number; boostDelta: number; cap: number | null }> {
    const date = new Date(dateStr)
    const applied = applyAllSelectableOverrides(cards, resolveRates(rates, date), resolveCaps(caps, date), overrides, date)
    const capFor = (catId: string): number | null => {
      const rel = applied.caps.filter(c => c.card_id === card.id && c.spend_limit != null && c.cap_period === 'monthly'
        && (c.category_id === catId || c.cap_group != null))
      return rel.length ? Math.min(...rel.map(c => c.spend_limit as number)) : null
    }
    // baseDelta = standard bonus above base; boostDelta = the POTENTIAL boost extra
    // (from card config, date-independent). Which spend actually gets the boost is
    // decided per transaction by resolveBoost, so mid-cycle toggles split correctly.
    const m = new Map<string, { baseDelta: number; boostDelta: number; cap: number | null }>()
    for (const r of applied.rates) {
      if (r.card_id === card.id && r.category_id != null && r.mpd > card.base_mpd) {
        const boostDelta = card.boost_mpd != null && card.boost_mpd > r.mpd ? card.boost_mpd - r.mpd : 0
        m.set(r.category_id, { baseDelta: r.mpd - card.base_mpd, boostDelta, cap: capFor(r.category_id) })
      }
    }
    return m
  }

  // Build per-(card, cycle) blocks: transaction lines + accumulated bonus lumps.
  const blocks = useMemo<Block[]>(() => {
    const map = new Map<string, Block>()
    for (const t of txns) {
      const card = t.card_id ? cardById.get(t.card_id) : null
      if (!card || card.card_type !== 'miles' || t.miles_earned == null) continue
      const prog = progForCard.get(card.id) ?? null
      const mk = monthKey(t.transaction_date)
      const bk = `${card.id}:${mk}`
      const blk = map.get(bk) ?? { key: bk, card, mk, prog, lines: [], lumps: [] }
      const { base, bonus } = splitBaseBonus(card.base_mpd, card.earn_increment, t.amount, t.miles_earned)
      blk.lines.push({
        txn: t,
        catName: t.category_id ? (catById.get(t.category_id)?.name ?? null) : null,
        baseMi: base, bonusMi: bonus,
        basePt: prog ? base / prog.miles_per_point : null,
        bonusPt: prog ? bonus / prog.miles_per_point : null,
      })
      map.set(bk, blk)
    }

    // Accumulated bonus lumps per block (per category for split cards, else one).
    for (const blk of map.values()) {
      const { card, mk, prog } = blk
      const deferred = card.bonus_timing === 'next_calendar_month'
      const creditDate = deferred ? firstOfNext(mk) : lastDayOf(mk)
      const block = card.earn_increment || 1
      const pushLump = (categoryId: string | null, miles: number, count: number, capped = false, capMi: number | null = null, kind = 'bonus', label = 'Bonus') => blk.lumps.push({
        key: `${card.id}:${kind}:${firstOf(mk)}:${categoryId ?? 'none'}`,
        card, kind, label, cycleMonth: firstOf(mk), categoryId,
        categoryName: categoryId ? (catById.get(categoryId)?.name ?? null) : null,
        creditDate, expectedMi: miles,
        expectedPt: prog ? miles / prog.miles_per_point : null,
        unit: prog?.unit_label ?? null, count, capped,
        capMi, capPt: prog && capMi != null ? capMi / prog.miles_per_point : null,
      })

      if (card.bonus_rounding === 'aggregate' && card.bonus_by_category) {
        // Exact aggregate: sum ALL eligible-category spend (incl. sub-block charges
        // and cents), cap it at the category cap, floor once to the block, ×per-$ rate.
        const info = bonusInfoByCat(card, lastDayOf(mk))
        // raw = all eligible spend; rawBoost = only spend dated while the boost was
        // active (resolved per transaction), so a mid-cycle toggle splits correctly.
        const cats = new Map<string, { raw: number; rawBoost: number; count: number }>()
        for (const l of blk.lines) {
          const cat = l.txn.category_id
          if (cat && info.has(cat)) {
            const b = cats.get(cat) ?? { raw: 0, rawBoost: 0, count: 0 }
            b.raw += l.txn.amount; b.count += 1
            if (resolveBoost(boosts, card.id, new Date(l.txn.transaction_date))) b.rawBoost += l.txn.amount
            cats.set(cat, b)
          }
        }
        for (const [cat, b] of cats) {
          const { baseDelta, boostDelta, cap } = info.get(cat)!
          const capBlocks = cap != null ? Math.floor(cap / block) * block : null
          // Standard program bonus — all eligible spend (boost-independent)
          const eligAll = Math.floor((cap != null ? Math.min(b.raw, cap) : b.raw) / block) * block
          pushLump(cat, eligAll * baseDelta, b.count, cap != null && b.raw > cap, capBlocks != null ? capBlocks * baseDelta : null)
          // Boost extra — only spend charged while the boost was active
          if (boostDelta > 0 && b.rawBoost > 0) {
            const eligBoost = Math.floor((cap != null ? Math.min(b.rawBoost, cap) : b.rawBoost) / block) * block
            pushLump(cat, eligBoost * boostDelta, b.count, cap != null && b.rawBoost > cap, capBlocks != null ? capBlocks * boostDelta : null,
              'bonus_boost', `${card.boost_label ?? 'Boost'} · +${boostDelta} mpd`)
          }
        }
      } else {
        // per_transaction (default), or aggregate channel/pool cards (approximate):
        // sum per-transaction bonus; for aggregate, floor the summed eligible spend.
        const buckets = new Map<string, { miles: number; count: number; raw: number; delta: number }>()
        for (const l of blk.lines) {
          if (l.bonusMi <= 0) continue
          const key = card.bonus_by_category ? (l.txn.category_id ?? 'none') : 'all'
          const b = buckets.get(key) ?? { miles: 0, count: 0, raw: 0, delta: 0 }
          b.miles += l.bonusMi; b.count += 1; b.raw += l.txn.amount
          const rounded = Math.floor(l.txn.amount / block) * block
          if (rounded > 0) b.delta = Math.max(b.delta, l.bonusMi / rounded)
          buckets.set(key, b)
        }
        for (const [key, b] of buckets) {
          const categoryId = card.bonus_by_category && key !== 'none' && key !== 'all' ? key : null
          const capSpend = capForBucket(card, categoryId)
          const capMi = capSpend != null && b.delta > 0 ? Math.floor(capSpend / block) * block * b.delta : null  // max bonus miles
          let miles = b.miles
          let capped = false
          if (card.bonus_rounding === 'aggregate') {
            const eligible = capSpend != null ? Math.min(b.raw, capSpend) : b.raw
            miles = Math.floor(eligible / block) * block * b.delta
            capped = capSpend != null && b.raw > capSpend
          } else if (capMi != null && miles > capMi) {
            // per-transaction: clamp the summed stored bonus at the cap ceiling
            miles = capMi; capped = true
          }
          pushLump(categoryId, miles, b.count, capped, capMi)
        }
      }
      blk.lines.sort((a, z) => a.txn.transaction_date.localeCompare(z.txn.transaction_date))
    }

    return [...map.values()].sort((a, z) => z.mk.localeCompare(a.mk) || a.card.name.localeCompare(z.card.name))
  }, [txns, cardById, catById, progForCard, caps, rates, overrides, cards, boosts])

  const baseDone = new Set(txnRecon.filter(r => r.base_reconciled).map(r => r.transaction_id))
  function bonusReconFor(l: BonusLump) {
    return bonusRecon.find(r => r.card_id === l.card.id && r.kind === l.kind && r.cycle_month === l.cycleMonth && (r.category_id ?? null) === l.categoryId)
  }

  async function toggleBase(txnId: string) {
    const on = baseDone.has(txnId)
    await supabase.from('transaction_point_recon').upsert(
      { transaction_id: txnId, user_id: user!.id, base_reconciled: !on, updated_at: new Date().toISOString() },
      { onConflict: 'transaction_id' }
    )
    await refetchTxnRecon()
  }

  async function saveBonusActual(l: BonusLump, raw: string) {
    const val = raw.trim() === '' ? null : Number(raw)
    const patch = l.expectedPt != null ? { actual_points: val } : { actual_miles: val }
    const existing = bonusReconFor(l)
    if (existing) await supabase.from('credit_reconciliations').update(patch).eq('id', existing.id)
    else await supabase.from('credit_reconciliations').insert({ user_id: user!.id, card_id: l.card.id, kind: l.kind, cycle_month: l.cycleMonth, category_id: l.categoryId, ...patch })
    await refetchBonus()
  }
  async function toggleBonus(l: BonusLump) {
    const existing = bonusReconFor(l)
    if (existing) await supabase.from('credit_reconciliations').update({ reconciled: !existing.reconciled }).eq('id', existing.id)
    else await supabase.from('credit_reconciliations').insert({ user_id: user!.id, card_id: l.card.id, kind: l.kind, cycle_month: l.cycleMonth, category_id: l.categoryId, reconciled: true })
    await refetchBonus()
  }
  const bonusActual = (l: BonusLump) => { const r = bonusReconFor(l); return l.expectedPt != null ? r?.actual_points ?? null : r?.actual_miles ?? null }

  const totalTxns = blocks.reduce((s, b) => s + b.lines.length, 0)
  const baseReconciled = blocks.reduce((s, b) => s + b.lines.filter(l => baseDone.has(l.txn.id)).length, 0)
  const allLumps = blocks.flatMap(b => b.lumps)
  const bonusReconciled = allLumps.filter(l => bonusReconFor(l)?.reconciled).length
  const lumpMismatch = (l: BonusLump) => { const a = bonusActual(l); const e = l.expectedPt ?? l.expectedMi; return a != null && Math.round(a) !== Math.round(e) }
  const mismatches = allLumps.filter(lumpMismatch).length

  // Filter options + filtered block list
  const cardOptions = Array.from(new Map(blocks.map(b => [b.card.id, `${b.card.bank} ${b.card.name}`])))
  const monthOptions = Array.from(new Set(blocks.map(b => b.mk))).sort((a, z) => z.localeCompare(a))
  const blockUnreconciled = (b: typeof blocks[number]) =>
    b.lines.some(l => !baseDone.has(l.txn.id)) || b.lumps.some(l => !bonusReconFor(l)?.reconciled)
  const visibleBlocks = blocks.filter(b =>
    (filterCard === 'all' || b.card.id === filterCard) &&
    (filterMonth === 'all' || b.mk === filterMonth) &&
    (filterStatus === 'all'
      || (filterStatus === 'unreconciled' && blockUnreconciled(b))
      || (filterStatus === 'mismatch' && b.lumps.some(lumpMismatch)))
  )
  const filtersActive = filterCard !== 'all' || filterMonth !== 'all' || filterStatus !== 'all'

  const unitCol = (pt: number | null, mi: number, unit: string | null) =>
    pt != null ? <>{fmtNum(pt)} <span className="text-gray-400">{unit}</span></> : <>{fmtNum(mi)} <span className="text-gray-400">mi</span></>

  return (
    <div className="space-y-5">
      <MilesTabs />

      <div className="flex items-start gap-2">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <ClipboardCheck size={20} className="text-indigo-600" /> Credit reconciliation
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Base points reconcile per transaction (posted on charge); bonus reconciles as the accumulated statement lump.
          </p>
        </div>
        <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
          <FlaskConical size={11} /> Experimental
        </span>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : blocks.length === 0 ? (
        <div className="card p-8 text-center space-y-2">
          <ClipboardCheck size={28} className="text-gray-300 mx-auto" />
          <p className="text-sm text-gray-500">No miles transactions to reconcile yet.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <span className="text-gray-500">Base: {baseReconciled}/{totalTxns} reconciled</span>
            <span className="text-gray-500">Bonus: {bonusReconciled}/{allLumps.length} lumps</span>
            {mismatches > 0 && <span className="text-red-600 inline-flex items-center gap-1"><AlertTriangle size={13} /> {mismatches} bonus mismatch</span>}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select value={filterCard} onChange={e => setFilterCard(e.target.value)} className="input text-sm w-auto">
              <option value="all">All cards</option>
              {cardOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
            <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="input text-sm w-auto">
              <option value="all">All months</option>
              {monthOptions.map(mk => <option key={mk} value={mk}>{fmtMonth(mk)}</option>)}
            </select>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
              {(['all', 'unreconciled', 'mismatch'] as const).map(s => (
                <button key={s} onClick={() => setFilterStatus(s)}
                  className={`px-2.5 py-1.5 capitalize ${filterStatus === s ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                  {s}
                </button>
              ))}
            </div>
            {filtersActive && (
              <button onClick={() => { setFilterCard('all'); setFilterMonth('all'); setFilterStatus('all') }}
                className="text-xs text-gray-500 hover:text-gray-700 underline">Clear</button>
            )}
          </div>

          {visibleBlocks.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">No credit events match these filters.</p>
          ) : visibleBlocks.map(blk => (
            <div key={blk.key} className="card p-4 space-y-3">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="font-semibold text-gray-900">{blk.card.bank} {blk.card.name}</h2>
                <span className="text-xs text-gray-500">{fmtMonth(blk.mk)}</span>
              </div>

              {/* Per-transaction: base (with tick) + bonus contribution */}
              <div className="divide-y divide-gray-50">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-gray-400 pb-1">
                  <span className="flex-1">Transaction</span>
                  <span className="w-20 text-right">Base</span>
                  <span className="w-20 text-right">Bonus</span>
                  <span className="w-7 text-center">✓</span>
                </div>
                {blk.lines.map(l => (
                  <div key={l.txn.id} className="flex items-center gap-2 py-1.5 text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-800 truncate">{l.txn.vendor_name || l.catName || 'Transaction'}</p>
                      <p className="text-xs text-gray-400">{fmtDay(l.txn.transaction_date)}{l.catName ? ` · ${l.catName}` : ''} · S${l.txn.amount.toFixed(2)}</p>
                    </div>
                    <span className="w-20 text-right text-gray-700">{unitCol(l.basePt, l.baseMi, blk.prog?.unit_label ?? null)}</span>
                    <span className="w-20 text-right text-gray-400">{l.bonusMi > 0 ? unitCol(l.bonusPt, l.bonusMi, blk.prog?.unit_label ?? null) : '—'}</span>
                    <button onClick={() => toggleBase(l.txn.id)} title={baseDone.has(l.txn.id) ? 'Base reconciled' : 'Mark base reconciled'}
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${baseDone.has(l.txn.id) ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-300 hover:text-gray-400'}`}>
                      <Check size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Accumulated bonus lump(s) — as shown on the statement */}
              {blk.lumps.length > 0 && (
                <div className="border-t border-gray-100 pt-3 space-y-2">
                  <p className="text-[11px] uppercase tracking-wide text-gray-400">Accumulated bonus</p>
                  {blk.lumps.map(l => {
                    const r = bonusReconFor(l)
                    const exp = l.expectedPt ?? l.expectedMi
                    const act = bonusActual(l)
                    const mismatch = act != null && Math.round(act) !== Math.round(exp)
                    const dk = l.key
                    const dv = drafts[dk] ?? (act != null ? String(act) : '')
                    return (
                      <div key={l.key} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 bg-indigo-50/40 rounded-lg px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-800">
                            {l.label}{l.categoryName ? ` · ${l.categoryName}` : ''}
                          </p>
                          <p className="text-xs text-gray-400">
                            credited {fmtDate(l.creditDate)} · {l.count} txn{l.count > 1 ? 's' : ''}
                            {l.capped && <span className="ml-1 text-amber-600">· cap reached</span>}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] text-gray-400">Expected</p>
                          <p className="text-sm font-medium text-gray-700">
                            {l.expectedPt != null ? <>{fmtNum(l.expectedPt)} {l.unit} <span className="text-gray-400 font-normal">· {fmtNum(l.expectedMi)} mi</span></> : <>{fmtNum(l.expectedMi)} mi</>}
                          </p>
                          {l.capMi != null && (
                            <p className="text-[11px] text-gray-400">
                              cap {l.capPt != null ? <>{fmtNum(l.capPt)} {l.unit}</> : <>{fmtNum(l.capMi)} mi</>}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <label className="text-[11px] text-gray-400 block">Actual {l.unit ?? 'mi'}</label>
                          <input type="number" inputMode="decimal" placeholder="—" value={dv}
                            onChange={e => setDrafts(d => ({ ...d, [dk]: e.target.value }))}
                            onBlur={e => { saveBonusActual(l, e.target.value); setDrafts(d => { const { [dk]: _, ...rest } = d; return rest }) }}
                            className={`input text-sm w-24 text-right ${mismatch ? 'border-red-300 text-red-600' : ''}`} />
                        </div>
                        <button onClick={() => toggleBonus(l)} title={r?.reconciled ? 'Bonus reconciled' : 'Mark bonus reconciled'}
                          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${r?.reconciled ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-300 hover:text-gray-400'}`}>
                          <Check size={15} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}

          <p className="text-xs text-gray-400">
            Base and bonus points are split from each transaction's earned miles (points via the program rate).
            Bonus timing follows each card's rule — deferred cards show the lump on the next month's credit date.
            Rules &amp; rates are indicative — edit them in the library.
          </p>
        </>
      )}
    </div>
  )
}
