import { useEffect, useMemo, useState } from 'react'
import { TrendingUp, CalendarDays, FileText, ChevronDown, ChevronRight, BarChart2, List, Award, CreditCard } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import MilesTabs from '../components/MilesTabs'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const START_YEAR = 2024

interface EarnRow { card_id: string | null; miles_earned: number | null; transaction_date: string }

// Parse 'YYYY-MM-DD' into a local Date (avoids UTC shift from new Date(str)).
function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// The effective statement closing day for a card: 0 means a plain calendar month.
function closingDay(card: { cap_cycle: string }, statementDays: Map<string, number>, cardId: string): number {
  if (card.cap_cycle !== 'statement') return 0
  const d = statementDays.get(cardId)
  return d && d > 1 ? d : 0
}

// Which (year, monthIdx) cycle a transaction belongs to.
// For statement cards the cycle is labelled by its closing month.
function cycleOf(dateStr: string, day: number): { year: number; monthIdx: number } {
  const d = parseDate(dateStr)
  if (day === 0 || d.getDate() < day) return { year: d.getFullYear(), monthIdx: d.getMonth() }
  // day >= closing day: belongs to the cycle that closes next month
  const c = new Date(d.getFullYear(), d.getMonth() + 1, 1)
  return { year: c.getFullYear(), monthIdx: c.getMonth() }
}

// Date range covered by a statement cycle closing on `day` of (year, monthIdx).
function statementRangeLabel(year: number, monthIdx: number, day: number): string {
  const start = new Date(year, monthIdx - 1, day)
  const end = new Date(year, monthIdx, day)
  end.setDate(end.getDate() - 1)
  return `${start.getDate()} ${MONTHS[start.getMonth()]} – ${end.getDate()} ${MONTHS[end.getMonth()]}`
}

const compact = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(0)}k` : String(n)

interface ChartRow { month: string; earned: number; cumulative: number }

// Build chart rows (monthly earned + running cumulative) from a 12-month array.
function buildRows(months: number[], lastMonthIdx: number): ChartRow[] {
  let running = 0
  const rows: ChartRow[] = []
  for (let i = 0; i <= lastMonthIdx; i++) {
    running += months[i]
    rows.push({ month: MONTHS[i], earned: Math.round(months[i]), cumulative: Math.round(running) })
  }
  return rows
}

function EarnChart({ data, height }: { data: ChartRow[]; height: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
        <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={compact} />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={compact} />
        <Tooltip
          formatter={(value, name) => [Math.round(Number(value)).toLocaleString(), name === 'earned' ? 'This month' : 'Cumulative']}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v: string) => v === 'earned' ? 'This month' : 'Cumulative'} />
        <Bar yAxisId="left" dataKey="earned" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40} />
        <Line yAxisId="right" type="monotone" dataKey="cumulative" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

export default function Earnings() {
  const { cards, statementDays } = useApp()
  const nowYear = new Date().getFullYear()
  const [year, setYear] = useState(nowYear)
  const [txns, setTxns] = useState<EarnRow[]>([])
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [cardView, setCardView] = useState<Record<string, 'chart' | 'numbers'>>({})

  function toggleCollapse(id: string) {
    setCollapsed(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleCollapseAll(cardIds: string[], allCollapsed: boolean) {
    setCollapsed(allCollapsed ? new Set() : new Set(cardIds))
  }
  function setView(id: string, v: 'chart' | 'numbers') {
    setCardView(prev => ({ ...prev, [id]: v }))
  }

  const milesCards = useMemo(() => cards.filter(c => c.card_type === 'miles'), [cards])
  const years = Array.from({ length: nowYear - START_YEAR + 1 }, (_, i) => START_YEAR + i)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    // Margin before/after the year so statement cycles straddling year ends are captured.
    supabase
      .from('transactions')
      .select('card_id, miles_earned, transaction_date')
      .gte('transaction_date', `${year - 1}-12-01`)
      .lt('transaction_date', `${year + 1}-02-01`)
      .then(({ data }) => {
        if (!cancelled) { setTxns((data as EarnRow[]) ?? []); setLoading(false) }
      })
    return () => { cancelled = true }
  }, [year])

  // months to display: full year for past years, up to current month for this year
  const lastMonthIdx = year < nowYear ? 11 : new Date().getMonth()

  // Per-card: array of miles per monthIdx (0..11) plus total, for the selected year.
  const perCard = useMemo(() => {
    return milesCards.map(card => {
      const day = closingDay(card, statementDays, card.id)
      const months = new Array(12).fill(0)
      for (const t of txns) {
        if (t.card_id !== card.id || !t.miles_earned) continue
        const { year: cy, monthIdx } = cycleOf(t.transaction_date, day)
        if (cy === year) months[monthIdx] += t.miles_earned
      }
      const total = months.reduce((s, m) => s + m, 0)
      return { card, day, months, total }
    })
  }, [milesCards, txns, statementDays, year])

  const grandTotal = perCard.reduce((s, c) => s + c.total, 0)

  // Combined monthly totals across all cards, with a running cumulative total.
  const chartData = useMemo(() => {
    const months = new Array(12).fill(0)
    for (const c of perCard) for (let i = 0; i < 12; i++) months[i] += c.months[i]
    return buildRows(months, lastMonthIdx)
  }, [perCard, lastMonthIdx])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Award size={22} className="text-indigo-500" />
          Miles
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Miles earned per billing cycle for each card — calendar month or statement cycle, per the card's setup.
        </p>
      </div>

      <div className="flex items-end justify-between gap-3">
        <MilesTabs />
        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          className="input text-sm py-1.5 w-28 mb-1"
        >
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Year total */}
      <div className="card p-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total earned in {year}</p>
          <p className="text-3xl font-bold text-indigo-600 mt-0.5">{Math.round(grandTotal).toLocaleString()}</p>
          <p className="text-xs text-gray-500">miles across {milesCards.length} card{milesCards.length === 1 ? '' : 's'}</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
          <TrendingUp size={22} className="text-indigo-500" />
        </div>
      </div>

      {/* Combined chart: monthly bars + cumulative line across all cards */}
      {!loading && milesCards.length > 0 && chartData.length > 0 && (
        <div className="card p-5">
          <p className="text-sm font-semibold text-gray-800 mb-4">All cards — earned per month &amp; cumulative</p>
          <EarnChart data={chartData} height={280} />
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : milesCards.length === 0 ? (
        <div className="card p-10 text-center border-dashed border-2 border-gray-200 space-y-3">
          <p className="text-gray-500 text-sm">No miles cards in your wallet yet.</p>
          <Link
            to="/cards"
            className="inline-flex items-center gap-1.5 text-sm font-medium bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <CreditCard size={14} /> Add cards in My Cards
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">By card</p>
            {(() => {
              const ids = perCard.map(c => c.card.id)
              const allCollapsed = ids.length > 0 && ids.every(id => collapsed.has(id))
              return (
                <button
                  onClick={() => toggleCollapseAll(ids, allCollapsed)}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                >
                  {allCollapsed ? 'Expand all' : 'Collapse all'}
                </button>
              )
            })()}
          </div>
          {perCard.map(({ card, day, months, total }) => {
            const isCollapsed = collapsed.has(card.id)
            const view = cardView[card.id] ?? 'chart'
            return (
              <div key={card.id} className="card p-5 space-y-3">
                {/* Card header */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleCollapse(card.id)}
                    className="shrink-0 text-gray-300 hover:text-gray-500 transition-colors"
                    title={isCollapsed ? 'Expand' : 'Collapse'}
                  >
                    {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                  </button>
                  <div
                    className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: card.color ?? '#6366f1' }}
                  >
                    {card.bank.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{card.bank} {card.name}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      {day === 0
                        ? <><CalendarDays size={11} /> Calendar month</>
                        : <><FileText size={11} /> Statement cycle · closes day {day}</>}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xl font-bold text-indigo-600">{Math.round(total).toLocaleString()}</p>
                    <p className="text-xs text-gray-500">miles in {year}</p>
                  </div>
                </div>

                {!isCollapsed && (
                  <>
                    {/* Chart / Numbers toggle */}
                    <div className="flex justify-end">
                      <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
                        <button
                          onClick={() => setView(card.id, 'chart')}
                          className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium transition-colors ${
                            view === 'chart' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          <BarChart2 size={12} /> Chart
                        </button>
                        <button
                          onClick={() => setView(card.id, 'numbers')}
                          className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium transition-colors ${
                            view === 'numbers' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          <List size={12} /> Numbers
                        </button>
                      </div>
                    </div>

                    {view === 'chart' ? (
                      <EarnChart data={buildRows(months, lastMonthIdx)} height={220} />
                    ) : (
                      <div className="border-t border-gray-100 pt-1">
                        {months.map((miles, idx) => {
                          if (idx > lastMonthIdx) return null
                          return (
                            <div key={idx} className="flex items-center gap-3 py-1.5 text-sm border-b border-gray-50 last:border-0">
                              <span className="w-12 shrink-0 font-medium text-gray-700">{MONTHS[idx]}</span>
                              {day !== 0 && (
                                <span className="text-xs text-gray-500 shrink-0 w-32">{statementRangeLabel(year, idx, day)}</span>
                              )}
                              <span className="flex-1" />
                              <span className={`font-medium tabular-nums ${miles > 0 ? 'text-gray-900' : 'text-gray-300'}`}>
                                {miles > 0 ? Math.round(miles).toLocaleString() : '—'}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
