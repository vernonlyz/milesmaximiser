import { useMemo } from 'react'
import { TrendingDown, Sparkles, ArrowRight } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { recommendCards, MccContext } from '../lib/recommendations'
import { Transaction } from '../lib/types'

// "Miles left on the table" — for each past transaction on a miles card, compare the
// miles actually earned with what the best wallet card would have earned for the same
// purchase (category, amount, MCC, channel). Cap-aware and chronological: each
// transaction sees the caps as they stood from prior actual spend. This is a greedy
// hindsight estimate (it doesn't re-simulate a globally optimal assignment).
export default function MissedMiles({ from, to }: { from: string; to: string }) {
  const { cards, categories, rates, caps, transactions, overrides, boosts, statementDays,
    cardMccEligibility, mccCatalogue, vendorCatalogue } = useApp()

  const analysis = useMemo(() => {
    const milesCards = cards.filter(c => c.card_type === 'miles')
    const catName = (id: string | null) => (id ? categories.find(c => c.id === id)?.name ?? null : null)
    const cardName = (id: string) => { const c = cards.find(x => x.id === id); return c ? `${c.bank} ${c.name}` : '—' }

    const mccCtxFor = (t: Transaction): MccContext | undefined => {
      const code = (t.mcc ?? '').trim()
      if (!code) return undefined
      const vendor = t.vendor_name ? vendorCatalogue.find(v => v.name.toLowerCase() === t.vendor_name!.toLowerCase() && v.default_mcc === code) : undefined
      const confirmed = vendor ? vendor.mcc_confidence !== 'unverified' : true
      const categoryId = mccCatalogue.find(m => m.code === code)?.default_category_id ?? null
      return { code, confirmed, rows: cardMccEligibility, categories, categoryId }
    }

    // Only settled transactions on a miles card with a category (recommendable).
    const milesCardIds = new Set(milesCards.map(c => c.id))
    const sorted = transactions
      .filter(t => t.card_id && milesCardIds.has(t.card_id) && t.category_id && t.miles_earned != null)
      .slice()
      .sort((a, b) => a.transaction_date.localeCompare(b.transaction_date) || a.created_at.localeCompare(b.created_at))

    const prior: Transaction[] = []
    type Rec = { txn: Transaction; actual: number; best: number; bestCardId: string; missed: number }
    const recs: Rec[] = []
    for (const t of sorted) {
      const ranked = recommendCards(milesCards, rates, caps, t.category_id!, t.amount, prior,
        new Date(t.transaction_date), overrides, t.payment_channel, statementDays, boosts, mccCtxFor(t))
      prior.push(t)
      if (!ranked.length) continue
      const bestRec = ranked[0]
      const actual = t.miles_earned ?? 0
      const best = bestRec.milesEarned
      recs.push({ txn: t, actual, best, bestCardId: bestRec.card.id, missed: Math.max(0, Math.round(best - actual)) })
    }

    // Restrict the DISPLAY to the selected range (compute used all history for cap context).
    const inRange = (d: string) => (!from || d >= from) && (!to || d <= to)
    const shown = recs.filter(r => inRange(r.txn.transaction_date))

    const totalActual = shown.reduce((s, r) => s + r.actual, 0)
    const totalBest = shown.reduce((s, r) => s + r.best, 0)
    const totalMissed = shown.reduce((s, r) => s + r.missed, 0)
    const capture = totalBest > 0 ? totalActual / totalBest : 1

    const byMonth = new Map<string, number>()
    for (const r of shown) {
      const mk = r.txn.transaction_date.slice(0, 7)
      byMonth.set(mk, (byMonth.get(mk) ?? 0) + r.missed)
    }
    const months = [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    const maxMonth = Math.max(1, ...months.map(([, v]) => v))

    const topMisses = shown.filter(r => r.missed > 0).sort((a, b) => b.missed - a.missed).slice(0, 8)

    return { count: shown.length, totalActual, totalBest, totalMissed, capture, months, maxMonth, topMisses, catName, cardName }
  }, [cards, categories, rates, caps, transactions, overrides, boosts, statementDays, cardMccEligibility, mccCatalogue, vendorCatalogue, from, to])

  const fmtMonth = (mk: string) => new Date(`${mk}-01`).toLocaleDateString('en-SG', { month: 'short', year: '2-digit' })
  const round = (n: number) => Math.round(n).toLocaleString()

  if (analysis.count === 0) {
    return <div className="card p-8 text-center text-sm text-gray-500">No miles-card transactions in this range to analyse yet.</div>
  }

  const capturePct = Math.round(analysis.capture * 100)

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Capture rate</p>
          <p className={`text-2xl font-bold leading-tight ${capturePct >= 95 ? 'text-emerald-600' : capturePct >= 85 ? 'text-amber-600' : 'text-red-600'}`}>{capturePct}%</p>
          <p className="text-xs text-gray-400 mt-0.5">of the best-possible miles</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Miles left on the table</p>
          <p className="text-2xl font-bold text-gray-900 leading-tight">{round(analysis.totalMissed)}</p>
          <p className="text-xs text-gray-400 mt-0.5">across {analysis.count} transactions</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Earned / Best</p>
          <p className="text-2xl font-bold text-gray-900 leading-tight">{round(analysis.totalActual)}<span className="text-gray-400 text-lg"> / {round(analysis.totalBest)}</span></p>
          <p className="text-xs text-gray-400 mt-0.5">actual vs optimal</p>
        </div>
      </div>

      {analysis.totalMissed === 0 ? (
        <div className="card p-6 text-center text-sm text-emerald-700 flex items-center justify-center gap-2">
          <Sparkles size={16} /> Nice — you used the best card on every transaction in this range.
        </div>
      ) : (
        <>
          {/* Missed by month */}
          {analysis.months.length > 1 && (
            <div className="card p-4">
              <p className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2"><TrendingDown size={15} className="text-red-500" /> Missed miles by month</p>
              <div className="space-y-1.5">
                {analysis.months.map(([mk, v]) => (
                  <div key={mk} className="flex items-center gap-2 text-xs">
                    <span className="w-12 text-gray-500 shrink-0">{fmtMonth(mk)}</span>
                    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-red-300 rounded-full" style={{ width: `${(v / analysis.maxMonth) * 100}%` }} />
                    </div>
                    <span className="w-16 text-right text-gray-600 tabular-nums shrink-0">{v > 0 ? `+${round(v)}` : '0'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top misses */}
          <div className="card p-4">
            <p className="text-sm font-semibold text-gray-800 mb-3">Biggest missed opportunities</p>
            <div className="divide-y divide-gray-50">
              {analysis.topMisses.map(r => (
                <div key={r.txn.id} className="flex items-center gap-2 py-2 text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-800 truncate">{r.txn.vendor_name || analysis.catName(r.txn.category_id) || 'Transaction'}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {r.txn.transaction_date} · S${r.txn.amount.toFixed(2)} · used {analysis.cardName(r.txn.card_id!)}
                      <span className="inline-flex items-center gap-0.5 text-indigo-500"> <ArrowRight size={10} /> {analysis.cardName(r.bestCardId)}</span>
                    </p>
                  </div>
                  <span className="text-red-600 font-semibold shrink-0 tabular-nums">+{round(r.missed)} mi</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <p className="text-xs text-gray-400">
        Estimate — compares each transaction against the best wallet card at that point (cap-aware, in date order).
        It doesn&apos;t re-plan your whole month, and it assumes your current wallet + chosen bonus categories.
      </p>
    </div>
  )
}
