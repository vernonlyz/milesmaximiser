import { useEffect, useMemo, useState } from 'react'
import { ClipboardCheck, FlaskConical, Check, AlertTriangle } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { supabase } from '../lib/supabase'
import { RewardProgram, CardRewardProgram, CreditReconciliation, CreditCard } from '../lib/types'
import { splitBaseBonus } from '../lib/recommendations'
import MilesTabs from '../components/MilesTabs'

interface TxnRow { card_id: string | null; category_id: string | null; amount: number; miles_earned: number | null; transaction_date: string }

// ── date helpers (local, string-based) ──────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, '0')
const monthKey = (d: string) => d.slice(0, 7)                 // 'YYYY-MM'
const firstOf = (mk: string) => `${mk}-01`
function lastDayOf(mk: string) {
  const [y, m] = mk.split('-').map(Number)
  return `${mk}-${pad(new Date(y, m, 0).getDate())}`
}
function firstOfNext(mk: string) {
  let [y, m] = mk.split('-').map(Number)
  m += 1; if (m > 12) { m = 1; y += 1 }
  return `${y}-${pad(m)}-01`
}
const fmtMonth = (mk: string) => new Date(firstOf(mk)).toLocaleDateString('en-SG', { month: 'short', year: 'numeric' })
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
const fmtNum = (n: number) => Math.round(n).toLocaleString('en-SG')

interface CreditEvent {
  key: string
  card: CreditCard
  kind: 'base' | 'bonus'
  cycleMonth: string          // 'YYYY-MM-01'
  categoryId: string | null
  categoryName: string | null
  creditDate: string          // 'YYYY-MM-DD'
  posted: boolean             // on-post (already credited) vs future lump
  expectedMiles: number
  expectedPoints: number | null
  unitLabel: string | null
  milesPerPoint: number | null
  txnCount: number
}

export default function Reconcile() {
  const { cards, categories } = useApp()
  const { user } = useAuth()
  const toast = useToast()

  const [txns, setTxns] = useState<TxnRow[]>([])
  const [programs, setPrograms] = useState<RewardProgram[]>([])
  const [mapping, setMapping] = useState<CardRewardProgram[]>([])
  const [recons, setRecons] = useState<CreditReconciliation[]>([])
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const [txRes, progRes, mapRes, recRes] = await Promise.all([
      supabase.from('transactions').select('card_id, category_id, amount, miles_earned, transaction_date'),
      supabase.from('reward_programs').select('*'),
      supabase.from('card_reward_program').select('*'),
      supabase.from('credit_reconciliations').select('*'),
    ])
    setTxns((txRes.data as TxnRow[]) ?? [])
    setPrograms((progRes.data as RewardProgram[]) ?? [])
    setMapping((mapRes.data as CardRewardProgram[]) ?? [])
    setRecons((recRes.data as CreditReconciliation[]) ?? [])
    setLoading(false)
  }
  async function refetchRecons() {
    const { data } = await supabase.from('credit_reconciliations').select('*')
    setRecons((data as CreditReconciliation[]) ?? [])
  }
  useEffect(() => { if (user) load() }, [user])

  const cardById = useMemo(() => new Map(cards.map(c => [c.id, c])), [cards])
  const catById = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories])
  const progForCard = useMemo(() => {
    const m = new Map<string, RewardProgram>()
    for (const map of mapping) {
      const p = programs.find(pr => pr.id === map.program_id)
      if (p) m.set(map.card_id, p)
    }
    return m
  }, [mapping, programs])

  // Project transactions → expected credit events by each card's crediting rule.
  const events = useMemo<CreditEvent[]>(() => {
    // Accumulate base/bonus per (card, cycle[, category]).
    interface Acc { base: number; bonus: Map<string, number>; bonusTotal: number; count: number }
    const byCardCycle = new Map<string, Acc>()

    for (const t of txns) {
      const card = t.card_id ? cardById.get(t.card_id) : null
      if (!card || card.card_type !== 'miles' || t.miles_earned == null) continue
      const { base, bonus } = splitBaseBonus(card.base_mpd, card.earn_increment, t.amount, t.miles_earned)
      const mk = monthKey(t.transaction_date)
      const ck = `${card.id}:${mk}`
      const acc = byCardCycle.get(ck) ?? { base: 0, bonus: new Map(), bonusTotal: 0, count: 0 }
      acc.base += base
      acc.bonusTotal += bonus
      const cat = t.category_id ?? 'none'
      acc.bonus.set(cat, (acc.bonus.get(cat) ?? 0) + bonus)
      acc.count += 1
      byCardCycle.set(ck, acc)
    }

    const out: CreditEvent[] = []
    const addEvent = (card: CreditCard, kind: 'base' | 'bonus', mk: string, categoryId: string | null, creditDate: string, posted: boolean, miles: number, count: number) => {
      if (kind === 'bonus' && Math.round(miles) === 0) return
      const prog = progForCard.get(card.id) ?? null
      out.push({
        key: `${card.id}:${kind}:${firstOf(mk)}:${categoryId ?? 'none'}`,
        card, kind, cycleMonth: firstOf(mk), categoryId,
        categoryName: categoryId ? (catById.get(categoryId)?.name ?? null) : null,
        creditDate, posted,
        expectedMiles: miles,
        expectedPoints: prog ? miles / prog.miles_per_point : null,
        unitLabel: prog?.unit_label ?? null,
        milesPerPoint: prog?.miles_per_point ?? null,
        txnCount: count,
      })
    }

    for (const [ck, acc] of byCardCycle) {
      const [cardId, mk] = ck.split(':')
      const card = cardById.get(cardId)!
      // Base — credited on posting (within the cycle).
      addEvent(card, 'base', mk, null, lastDayOf(mk), true, acc.base, acc.count)

      // Bonus — timing per card rule.
      const deferred = card.bonus_timing === 'next_calendar_month'
      const creditDate = deferred ? firstOfNext(mk) : lastDayOf(mk)
      if (deferred && card.bonus_by_category) {
        for (const [cat, miles] of acc.bonus) {
          addEvent(card, 'bonus', mk, cat === 'none' ? null : cat, creditDate, false, miles, acc.count)
        }
      } else {
        addEvent(card, 'bonus', mk, null, creditDate, !deferred, acc.bonusTotal, acc.count)
      }
    }

    // Newest credit date first.
    return out.sort((a, b) => b.creditDate.localeCompare(a.creditDate) || a.card.name.localeCompare(b.card.name))
  }, [txns, cardById, catById, progForCard])

  function reconFor(e: CreditEvent) {
    return recons.find(r => r.card_id === e.card.id && r.kind === e.kind && r.cycle_month === e.cycleMonth
      && (r.category_id ?? null) === e.categoryId)
  }

  // Primary unit = points when the card maps to a program, else miles.
  function expectedPrimary(e: CreditEvent) { return e.expectedPoints ?? e.expectedMiles }
  function actualPrimary(e: CreditEvent) {
    const r = reconFor(e)
    return e.expectedPoints != null ? r?.actual_points ?? null : r?.actual_miles ?? null
  }

  async function saveActual(e: CreditEvent, raw: string) {
    const val = raw.trim() === '' ? null : Number(raw)
    const existing = reconFor(e)
    const patch = e.expectedPoints != null ? { actual_points: val } : { actual_miles: val }
    if (existing) {
      await supabase.from('credit_reconciliations').update(patch).eq('id', existing.id)
    } else {
      await supabase.from('credit_reconciliations').insert({
        user_id: user!.id, card_id: e.card.id, kind: e.kind, cycle_month: e.cycleMonth,
        category_id: e.categoryId, ...patch,
      })
    }
    await refetchRecons()
  }

  async function toggleReconciled(e: CreditEvent) {
    const existing = reconFor(e)
    if (existing) {
      await supabase.from('credit_reconciliations').update({ reconciled: !existing.reconciled }).eq('id', existing.id)
    } else {
      await supabase.from('credit_reconciliations').insert({
        user_id: user!.id, card_id: e.card.id, kind: e.kind, cycle_month: e.cycleMonth,
        category_id: e.categoryId, reconciled: true,
      })
    }
    await refetchRecons()
  }

  // Group by credit date for display.
  const groups = useMemo(() => {
    const m = new Map<string, CreditEvent[]>()
    for (const e of events) { const g = m.get(e.creditDate) ?? []; g.push(e); m.set(e.creditDate, g) }
    return [...m.entries()]
  }, [events])

  const reconciledCount = events.filter(e => reconFor(e)?.reconciled).length
  const discrepancies = events.filter(e => {
    const a = actualPrimary(e); return a != null && Math.round(a) !== Math.round(expectedPrimary(e))
  }).length

  return (
    <div className="space-y-5">
      <MilesTabs />

      <div className="flex items-start gap-2">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <ClipboardCheck size={20} className="text-indigo-600" /> Credit reconciliation
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Expected base &amp; bonus per crediting cycle vs what the bank actually credited.
          </p>
        </div>
        <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
          <FlaskConical size={11} /> Experimental
        </span>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : events.length === 0 ? (
        <div className="card p-8 text-center space-y-2">
          <ClipboardCheck size={28} className="text-gray-300 mx-auto" />
          <p className="text-sm text-gray-500">No miles transactions to reconcile yet.</p>
        </div>
      ) : (
        <>
          <div className="flex gap-4 text-sm">
            <span className="text-gray-500">{events.length} credit events</span>
            <span className="text-emerald-600">{reconciledCount} reconciled</span>
            {discrepancies > 0 && <span className="text-red-600 inline-flex items-center gap-1"><AlertTriangle size={13} /> {discrepancies} mismatch</span>}
          </div>

          {groups.map(([creditDate, evs]) => (
            <div key={creditDate} className="space-y-2">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Credited {fmtDate(creditDate)}
                {evs[0].posted && <span className="ml-1 font-normal normal-case text-gray-400">· as posted</span>}
              </h2>
              <div className="card divide-y divide-gray-100">
                {evs.map(e => {
                  const r = reconFor(e)
                  const exp = expectedPrimary(e)
                  const act = actualPrimary(e)
                  const mismatch = act != null && Math.round(act) !== Math.round(exp)
                  const draftKey = e.key
                  const draftVal = drafts[draftKey] ?? (act != null ? String(act) : '')
                  return (
                    <div key={e.key} className="p-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
                          {e.card.bank} {e.card.name}
                          <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${e.kind === 'bonus' ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
                            {e.kind === 'bonus' ? 'Bonus' : 'Base'}{e.categoryName ? ` · ${e.categoryName}` : ''}
                          </span>
                        </p>
                        <p className="text-xs text-gray-400">for {fmtMonth(monthKey(e.cycleMonth))} · {e.txnCount} txn{e.txnCount > 1 ? 's' : ''}</p>
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-gray-400">Expected</p>
                        <p className="text-sm font-medium text-gray-700">
                          {e.expectedPoints != null
                            ? <>{fmtNum(e.expectedPoints)} {e.unitLabel} <span className="text-gray-400 font-normal">· {fmtNum(e.expectedMiles)} mi</span></>
                            : <>{fmtNum(e.expectedMiles)} mi</>}
                        </p>
                      </div>

                      <div className="text-right">
                        <label className="text-xs text-gray-400 block">Actual {e.unitLabel ?? 'mi'}</label>
                        <input
                          type="number" inputMode="decimal" placeholder="—"
                          value={draftVal}
                          onChange={ev => setDrafts(d => ({ ...d, [draftKey]: ev.target.value }))}
                          onBlur={ev => { saveActual(e, ev.target.value); setDrafts(d => { const { [draftKey]: _, ...rest } = d; return rest }) }}
                          className={`input text-sm w-24 text-right ${mismatch ? 'border-red-300 text-red-600' : ''}`}
                        />
                      </div>

                      <button
                        onClick={() => toggleReconciled(e)}
                        title={r?.reconciled ? 'Reconciled' : 'Mark reconciled'}
                        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                          r?.reconciled ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-300 hover:text-gray-400'}`}
                      >
                        <Check size={15} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          <p className="text-xs text-gray-400">
            Base is credited on posting; bonus timing follows each card's rule (some cards credit bonus at the
            start of the next month, split by category). Expected miles are split from each transaction's earned
            miles; points use the program's conversion rate. Rules &amp; rates are indicative — edit in the library.
          </p>
        </>
      )}
    </div>
  )
}
