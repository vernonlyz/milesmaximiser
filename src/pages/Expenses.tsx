import { useMemo, useState } from 'react'
import { TrendingUp, Percent, Wallet, Receipt, RefreshCw, AlertCircle, BarChart2, Info, Download } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { currentMonthLabel, formatSGD, isoDate } from '../lib/utils'
import * as XLSX from 'xlsx'
import { Transaction } from '../lib/types'

export default function Expenses() {
  const { cards, allCards, categories, transactions, loading, error, refresh } = useApp()

  const [viewMode, setViewMode] = useState<'card' | 'personal'>('card')

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const monthTxns = transactions.filter(t => t.transaction_date >= monthStart)

  // True if any transaction this month has a personal split recorded
  const hasGroupSpends = monthTxns.some(t => t.personal_amount != null && t.personal_amount !== t.amount)

  // Returns the spend amount to count based on view mode
  function eff(t: Transaction) {
    return viewMode === 'personal' ? (t.personal_amount ?? t.amount) : t.amount
  }

  const cardTypeMap = useMemo(() => {
    const m = new Map<string, 'miles' | 'cashback' | 'debit'>()
    for (const c of allCards) m.set(c.id, c.card_type)
    return m
  }, [allCards])

  const totalSpent     = monthTxns.reduce((s, t) => s + eff(t), 0)
  const milesSpend     = monthTxns.filter(t => t.card_id && cardTypeMap.get(t.card_id) === 'miles')   .reduce((s, t) => s + eff(t), 0)
  const cashbackSpend  = monthTxns.filter(t => t.card_id && cardTypeMap.get(t.card_id) === 'cashback').reduce((s, t) => s + eff(t), 0)
  const debitSpend     = monthTxns.filter(t => t.card_id && cardTypeMap.get(t.card_id) === 'debit')   .reduce((s, t) => s + eff(t), 0)
  // Rewards are always based on full card amount — unaffected by split view
  const totalMiles     = monthTxns.reduce((s, t) => s + (t.miles_earned ?? 0), 0)
  const totalCashback  = monthTxns.reduce((s, t) => s + (t.cashback_earned ?? 0), 0)

  const catSpend = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of monthTxns) {
      if (!t.category_id) continue
      map.set(t.category_id, (map.get(t.category_id) ?? 0) + eff(t))
    }
    return Array.from(map.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([catId, amt]) => ({ catId, amt, cat: categories.find(c => c.id === catId) }))
  }, [monthTxns, categories, viewMode])

  const cardSpend = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of monthTxns) {
      if (!t.card_id) continue
      map.set(t.card_id, (map.get(t.card_id) ?? 0) + eff(t))
    }
    return Array.from(map.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([cardId, amt]) => ({
        cardId,
        amt,
        card: cards.find(c => c.id === cardId) ?? allCards.find(c => c.id === cardId),
      }))
      .filter(r => r.card)
  }, [monthTxns, cards, allCards, viewMode])

  function handleExport() {
    const month = isoDate().slice(0, 7)
    const wb = XLSX.utils.book_new()

    // Compute both views independently — no dependency on current toggle state
    const cardAmt  = (t: Transaction) => t.amount
    const myAmt    = (t: Transaction) => t.personal_amount ?? t.amount
    const cardTypeMap = new Map(allCards.map(c => [c.id, c.card_type]))

    const cTotal   = monthTxns.reduce((s, t) => s + cardAmt(t), 0)
    const mTotal   = monthTxns.reduce((s, t) => s + myAmt(t), 0)
    const cMiles   = monthTxns.filter(t => cardTypeMap.get(t.card_id ?? '') === 'miles').reduce((s, t) => s + cardAmt(t), 0)
    const mMiles   = monthTxns.filter(t => cardTypeMap.get(t.card_id ?? '') === 'miles').reduce((s, t) => s + myAmt(t), 0)
    const cCash    = monthTxns.filter(t => cardTypeMap.get(t.card_id ?? '') === 'cashback').reduce((s, t) => s + cardAmt(t), 0)
    const mCash    = monthTxns.filter(t => cardTypeMap.get(t.card_id ?? '') === 'cashback').reduce((s, t) => s + myAmt(t), 0)
    const cDebit   = monthTxns.filter(t => cardTypeMap.get(t.card_id ?? '') === 'debit').reduce((s, t) => s + cardAmt(t), 0)
    const mDebit   = monthTxns.filter(t => cardTypeMap.get(t.card_id ?? '') === 'debit').reduce((s, t) => s + myAmt(t), 0)
    const totMiles = monthTxns.reduce((s, t) => s + (t.miles_earned ?? 0), 0)
    const totCashback = monthTxns.reduce((s, t) => s + (t.cashback_earned ?? 0), 0)

    const note = 'Card Spend = full amount charged to your card (used for miles/cashback). My Spend = your personal share when splitting a group bill.'

    // Sheet 1: Summary
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Note', note],
      [],
      ['Metric', 'Card Spend (S$)', 'My Spend (S$)'],
      ['Month', month, ''],
      [],
      ['Total Spent',       parseFloat(cTotal.toFixed(2)),  parseFloat(mTotal.toFixed(2))],
      ['Miles Cards',       parseFloat(cMiles.toFixed(2)),  parseFloat(mMiles.toFixed(2))],
      ['Cashback Cards',    parseFloat(cCash.toFixed(2)),   parseFloat(mCash.toFixed(2))],
      ['Cash / Debit',      parseFloat(cDebit.toFixed(2)),  parseFloat(mDebit.toFixed(2))],
      [],
      ['Miles Earned (on card amount)',    Math.round(totMiles),                    '(same — rewards on full charge)'],
      ['Cashback Earned (on card amount)', parseFloat(totCashback.toFixed(4)), '(same — rewards on full charge)'],
    ]), 'Summary')

    // Sheet 2: By Category — collect all categories, compute both views
    const catMap = new Map<string, { card: number; my: number }>()
    for (const t of monthTxns) {
      if (!t.category_id) continue
      const prev = catMap.get(t.category_id) ?? { card: 0, my: 0 }
      catMap.set(t.category_id, { card: prev.card + cardAmt(t), my: prev.my + myAmt(t) })
    }
    const catRows = Array.from(catMap.entries())
      .sort(([, a], [, b]) => b.card - a.card)
      .map(([catId, { card, my }]) => {
        const cat = categories.find(c => c.id === catId)
        return [
          cat ? cat.name : '—',
          parseFloat(card.toFixed(2)),
          cTotal > 0 ? parseFloat(((card / cTotal) * 100).toFixed(1)) : 0,
          parseFloat(my.toFixed(2)),
          mTotal > 0 ? parseFloat(((my / mTotal) * 100).toFixed(1)) : 0,
        ]
      })
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Note', note],
      [],
      ['Category', 'Card Spend (S$)', '% of Card Total', 'My Spend (S$)', '% of My Total'],
      ...catRows,
    ]), 'By Category')

    // Sheet 3: By Card — same treatment
    const cardIdMap = new Map<string, { card: number; my: number }>()
    for (const t of monthTxns) {
      if (!t.card_id) continue
      const prev = cardIdMap.get(t.card_id) ?? { card: 0, my: 0 }
      cardIdMap.set(t.card_id, { card: prev.card + cardAmt(t), my: prev.my + myAmt(t) })
    }
    const byCardRows = Array.from(cardIdMap.entries())
      .sort(([, a], [, b]) => b.card - a.card)
      .map(([cardId, { card, my }]) => {
        const c = cards.find(x => x.id === cardId) ?? allCards.find(x => x.id === cardId)
        const milesEarned = monthTxns.filter(t => t.card_id === cardId).reduce((s, t) => s + (t.miles_earned ?? 0), 0)
        const cashbackEarned = monthTxns.filter(t => t.card_id === cardId).reduce((s, t) => s + (t.cashback_earned ?? 0), 0)
        return [
          c ? (c.card_type === 'debit' ? c.name : `${c.bank} ${c.name}`) : '—',
          c?.card_type ?? '',
          parseFloat(card.toFixed(2)),
          parseFloat(my.toFixed(2)),
          milesEarned > 0 ? Math.round(milesEarned) : '',
          cashbackEarned > 0 ? parseFloat(cashbackEarned.toFixed(4)) : '',
        ]
      })
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Note', note],
      [],
      ['Card', 'Type', 'Card Spend (S$)', 'My Spend (S$)', 'Miles Earned', 'Cashback Earned (S$)'],
      ...byCardRows,
    ]), 'By Card')

    // Sheet 4: Transactions — both amount columns always present
    const txNote = 'Card Charge = full amount billed (miles/cashback earned on this). Personal Share = your portion of the spend; equals Card Charge when not a group split.'
    const txHeaders = ['Date', 'Vendor', 'Category', 'Card', 'Card Charge (S$)', 'Personal Share (S$)', 'Payment Channel', 'Miles Earned', 'MPD', 'Cashback Earned (S$)', 'Notes']
    const txRows = monthTxns.map(t => {
      const c = cards.find(x => x.id === t.card_id) ?? allCards.find(x => x.id === t.card_id)
      const cat = categories.find(x => x.id === t.category_id)
      return [
        t.transaction_date,
        t.vendor_name ?? '',
        cat ? cat.name : '',
        c ? (c.card_type === 'debit' ? c.name : `${c.bank} ${c.name}`) : '',
        t.amount,
        t.personal_amount ?? t.amount,
        t.payment_channel ?? '',
        t.miles_earned != null ? Math.round(t.miles_earned) : '',
        t.effective_mpd != null ? parseFloat(t.effective_mpd.toFixed(4)) : '',
        t.cashback_earned != null ? parseFloat(t.cashback_earned.toFixed(4)) : '',
        t.description ?? '',
      ]
    })
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Note', txNote], [], txHeaders, ...txRows]), 'Transactions')

    XLSX.writeFile(wb, `expenses_${month}.xlsx`)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      <RefreshCw size={24} className="animate-spin mr-2" /> Loading…
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
      <AlertCircle size={32} className="text-red-400" />
      <p className="font-medium text-gray-800">Could not load data</p>
      <button onClick={refresh} className="btn-secondary"><RefreshCw size={14} /> Retry</button>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="text-sm text-gray-500 mt-0.5">{currentMonthLabel()}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle — only shown when group spends exist */}
          {hasGroupSpends && (
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5">
              {(['card', 'personal'] as const).map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    viewMode === mode
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {mode === 'card' ? 'Card spend' : 'My spend'}
                </button>
              ))}
            </div>
          )}
          {monthTxns.length > 0 && (
            <button onClick={handleExport} className="btn-secondary text-xs">
              <Download size={13} />
              <span className="hidden sm:inline">Export Excel</span>
            </button>
          )}
          <button onClick={refresh} className="btn-secondary text-xs">
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* Spend by type — 4 stat chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatChip label="Miles Cards"     value={formatSGD(milesSpend)}    icon={<TrendingUp size={16} className="text-indigo-600" />} bg="bg-indigo-50" />
        <StatChip label="Cashback Cards"  value={formatSGD(cashbackSpend)} icon={<Percent    size={16} className="text-emerald-600" />} bg="bg-emerald-50" />
        <StatChip label="Cash / Debit"    value={formatSGD(debitSpend)}    icon={<Wallet     size={16} className="text-gray-500" />}   bg="bg-gray-100" />
        <StatChip label="Total Spent"     value={formatSGD(totalSpent)}    icon={<Receipt    size={16} className="text-sky-600" />}    bg="bg-sky-50" bold />
      </div>

      {/* My spend mode banner */}
      {viewMode === 'personal' && hasGroupSpends && (
        <div className="flex items-start gap-2.5 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
          <Info size={14} className="text-indigo-500 mt-0.5 shrink-0" />
          <p className="text-sm text-indigo-700">
            <span className="font-medium">My spend</span> shows your personal share of group spends.{' '}
            <span className="text-indigo-500">Miles and cashback are always earned on the full amount charged to your card.</span>
          </p>
        </div>
      )}

      {/* Rewards earned — always based on card amount */}
      {(totalMiles > 0 || totalCashback > 0) && (
        <div className="card p-4 flex flex-wrap gap-6">
          {totalMiles > 0 && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Miles Earned</p>
              <p className="text-xl font-bold text-indigo-600">{Math.round(totalMiles).toLocaleString()} mi</p>
            </div>
          )}
          {totalCashback > 0 && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Cashback Earned</p>
              <p className="text-xl font-bold text-emerald-600">S${totalCashback.toFixed(2)}</p>
            </div>
          )}
          {viewMode === 'personal' && hasGroupSpends && (
            <div className="ml-auto self-center">
              <p className="text-xs text-gray-400">Rewards earned on full card amount</p>
            </div>
          )}
        </div>
      )}

      {monthTxns.length === 0 ? (
        <div className="card p-10 text-center text-gray-400">
          <BarChart2 size={32} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">No transactions this month yet.</p>
        </div>
      ) : (
        <>
          {/* Spend by category */}
          <div className="card p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Spend by Category</h2>
            <div className="space-y-3">
              {catSpend.map(({ catId, amt, cat }) => {
                const pct = totalSpent > 0 ? (amt / totalSpent) * 100 : 0
                return (
                  <div key={catId}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-700">{cat ? `${cat.icon} ${cat.name}` : '—'}</span>
                      <span className="text-gray-600 tabular-nums">
                        {formatSGD(amt)}
                        <span className="text-gray-400 ml-2 text-xs">{Math.round(pct)}%</span>
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-indigo-300" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Spend by card */}
          {cardSpend.length > 1 && (
            <div className="card p-5">
              <h2 className="font-semibold text-gray-800 mb-4">Spend by Card</h2>
              <div className="space-y-3">
                {cardSpend.map(({ cardId, amt, card }) => {
                  const pct = totalSpent > 0 ? (amt / totalSpent) * 100 : 0
                  const cashbackEarned = monthTxns
                    .filter(t => t.card_id === cardId)
                    .reduce((s, t) => s + (t.cashback_earned ?? 0), 0)
                  const milesEarned = monthTxns
                    .filter(t => t.card_id === cardId)
                    .reduce((s, t) => s + (t.miles_earned ?? 0), 0)
                  return (
                    <div key={cardId}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: card!.color }}
                          />
                          <span className="text-gray-700">{card!.bank} {card!.name}</span>
                        </span>
                        <span className="text-gray-600 tabular-nums flex items-center gap-2">
                          {milesEarned > 0 && (
                            <span className="text-indigo-500 text-xs">+{Math.round(milesEarned)} mi</span>
                          )}
                          {cashbackEarned > 0 && (
                            <span className="text-emerald-500 text-xs">+S${cashbackEarned.toFixed(2)}</span>
                          )}
                          {formatSGD(amt)}
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-indigo-200" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function StatChip({ label, value, icon, bg, bold }: {
  label: string; value: string; icon: React.ReactNode; bg: string; bold?: boolean
}) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium truncate">{label}</p>
        <p className={`text-base sm:text-lg font-bold leading-tight truncate ${bold ? 'text-gray-900' : 'text-gray-800'}`}>{value}</p>
      </div>
    </div>
  )
}
