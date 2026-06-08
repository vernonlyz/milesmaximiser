import { useState, useMemo } from 'react'
import { Sparkles, Trophy, ChevronDown } from 'lucide-react'
import { useApp } from '../context/AppContext'
import StatusBadge from '../components/StatusBadge'
import { recommendCards } from '../lib/recommendations'
import { formatSGD } from '../lib/utils'
import { CardRecommendation } from '../lib/types'

export default function Recommend() {
  const { cards, categories, rates, caps, transactions, overrides } = useApp()

  const [categoryId, setCategoryId] = useState('')
  const [amountStr, setAmountStr] = useState('')

  const amount = parseFloat(amountStr) || 0

  const recs = useMemo<CardRecommendation[]>(() => {
    if (!categoryId || amount <= 0) return []
    // recommendCards now resolves effective rates/caps and period spending internally
    return recommendCards(cards, rates, caps, categoryId, amount, transactions, new Date(), overrides)
  }, [cards, rates, caps, categoryId, amount, transactions, overrides])

  const cat = categories.find(c => c.id === categoryId)

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Card Recommender</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Find the best card to maximise miles, accounting for your current cap usage.
        </p>
      </div>

      {/* Inputs */}
      <div className="card p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Spending Category</label>
            <div className="relative">
              <select
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                className="input appearance-none pr-8"
              >
                <option value="">Select category…</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="label">Amount (S$)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={amountStr}
              onChange={e => setAmountStr(e.target.value)}
              className="input"
            />
          </div>
        </div>
      </div>

      {/* Results */}
      {categoryId && amount > 0 ? (
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
            Best cards for {cat?.icon} {cat?.name} · {formatSGD(amount)}
          </h2>

          {recs.map((rec, i) => (
            <RecCard key={rec.card.id} rec={rec} rank={i + 1} />
          ))}
        </div>
      ) : (
        <div className="card p-10 text-center border-dashed border-2 border-gray-200">
          <Sparkles size={32} className="text-indigo-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">
            Select a category and enter an amount to see which card earns the most miles.
          </p>
        </div>
      )}
    </div>
  )
}

function RecCard({ rec, rank }: { rec: CardRecommendation; rank: number }) {
  const isBest = rank === 1

  return (
    <div
      className={`card p-4 transition-all ${
        isBest ? 'ring-2 ring-indigo-500 border-indigo-200' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Rank badge */}
        <div
          className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 ${
            isBest ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'
          }`}
        >
          {isBest ? <Trophy size={12} /> : rank}
        </div>

        {/* Card colour stripe */}
        <div
          className="w-1 self-stretch rounded-full shrink-0"
          style={{ backgroundColor: rec.card.color }}
        />

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900">{rec.card.bank} {rec.card.name}</span>
            <StatusBadge status={rec.status} />
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{rec.reason}</p>
        </div>

        {/* MPD + miles */}
        <div className="text-right shrink-0">
          <p className="text-xl font-bold text-gray-900">
            {rec.effectiveMpd.toFixed(2)}
            <span className="text-sm font-normal text-gray-400 ml-1">mpd</span>
          </p>
          <p className="text-xs text-indigo-600 font-medium">
            +{Math.round(rec.milesEarned).toLocaleString()} miles
          </p>
        </div>
      </div>

      {/* Cap progress bar (only if this category has a cap) */}
      {rec.capAmount !== null && rec.capPeriod !== 'per_transaction' && (
        <div className="mt-3 ml-10">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Cap usage this {rec.capPeriod?.replace('ly', '')}</span>
            <span>
              {rec.capAmount !== null && rec.capRemaining !== null
                ? `${formatSGD(rec.capAmount - rec.capRemaining)} / ${formatSGD(rec.capAmount)}`
                : ''}
            </span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                rec.status === 'capped' ? 'bg-red-400' :
                rec.status === 'partial' ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
              style={{
                width: rec.capAmount
                  ? `${Math.min(((rec.capAmount - (rec.capRemaining ?? 0)) / rec.capAmount) * 100, 100)}%`
                  : '0%',
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
