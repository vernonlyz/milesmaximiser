import { useMemo, useState } from 'react'
import { TrendingUp, Percent, Wallet, Receipt, RefreshCw, AlertCircle, BarChart2, Info, Download } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { currentMonthLabel, formatSGD, exportCsv, isoDate } from '../lib/utils'
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
    const label = viewMode === 'personal' ? 'my_spend' : 'card_spend'

    // Section 1: spend by category
    const catHeaders = ['Section', 'Category', `Amount (S$) — ${label}`]
    const catRows = catSpend.map(({ cat, amt }) => [
      'By Category',
      cat ? `${cat.icon} ${cat.name}` : '—',
      amt.toFixed(2),
    ])

    // Section 2: spend by card
    const cardRows = cardSpend.map(({ card, amt }) => {
      const milesEarned = monthTxns.filter(t => t.card_id === card!.id).reduce((s, t) => s + (t.miles_earned ?? 0), 0)
      const cashbackEarned = monthTxns.filter(t => t.card_id === card!.id).reduce((s, t) => s + (t.cashback_earned ?? 0), 0)
      return [
        'By Card',
        card ? (card.card_type === 'debit' ? card.name : `${card.bank} ${card.name}`) : '—',
        amt.toFixed(2),
        milesEarned > 0 ? Math.round(milesEarned) : '',
        cashbackEarned > 0 ? cashbackEarned.toFixed(4) : '',
      ]
    })
    const cardHeaders = ['Section', 'Card', `Amount (S$) — ${label}`, 'Miles Earned', 'Cashback Earned (S$)']

    // Summary row
    const summaryHeaders = ['Metric', 'Value']
    const summaryRows = [
      ['Total Spent', totalSpent.toFixed(2)],
      ['Miles Cards', milesSpend.toFixed(2)],
      ['Cashback Cards', cashbackSpend.toFixed(2)],
      ['Cash / Debit', debitSpend.toFixed(2)],
      ['Total Miles Earned', Math.round(totalMiles).toString()],
      ['Total Cashback Earned (S$)', totalCashback.toFixed(4)],
    ]

    // Combine into one CSV with blank-line separators
    const allHeaders = summaryHeaders
    const allRows: (string | number | null | undefined)[][] = [
      ...summaryRows,
      [],
      catHeaders,
      ...catRows,
      [],
      cardHeaders,
      ...cardRows,
    ]
    exportCsv(`expenses_${month}_${label}.csv`, allHeaders, allRows)
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
              <span className="hidden sm:inline">Export CSV</span>
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
