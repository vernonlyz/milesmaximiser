import { useState, useEffect, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useApp } from '../context/AppContext'
import { Transaction } from '../lib/types'

const CAT_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 640)
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < 640)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return mobile
}

function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthsBack(n: number) {
  const d = new Date()
  d.setMonth(d.getMonth() - (n - 1))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function shortLabel(mk: string) {
  const [y, m] = mk.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleString('en-SG', { month: 'short', year: '2-digit' })
}

function buildMonthRange(from: string, to: string) {
  const months: string[] = []
  let [y, m] = from.split('-').map(Number)
  const [toY, toM] = to.split('-').map(Number)
  while (y < toY || (y === toY && m <= toM)) {
    months.push(`${y}-${String(m).padStart(2, '0')}`)
    if (++m > 12) { m = 1; y++ }
  }
  return months
}

function r2(n: number) { return Math.round(n * 100) / 100 }

// Compact dollar formatter for Y-axis ticks
function fmtY(v: number) {
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}k`
  return `$${v}`
}

type QuickRange = 3 | 6 | 12

export default function ExpensesTrends() {
  const { allCards, categories } = useApp()
  const isMobile = useIsMobile()

  const defaultRange: QuickRange = window.innerWidth < 640 ? 3 : 6
  const [quickRange, setQuickRange] = useState<QuickRange>(defaultRange)
  const [isCustom, setIsCustom]   = useState(false)
  const [fromMonth, setFromMonth] = useState(() => monthsBack(defaultRange))
  const [toMonth, setToMonth]     = useState(currentMonth)
  const [txns, setTxns]           = useState<Transaction[]>([])
  const [loading, setLoading]     = useState(false)

  useEffect(() => { load(fromMonth, toMonth) }, [fromMonth, toMonth])

  async function load(from: string, to: string) {
    setLoading(true)
    const [toY, toM] = to.split('-').map(Number)
    const nextM = toM === 12
      ? `${toY + 1}-01-01`
      : `${toY}-${String(toM + 1).padStart(2, '0')}-01`
    const { data } = await supabase
      .from('transactions')
      .select('id, transaction_date, amount, personal_amount, miles_earned, cashback_earned, category_id, card_id')
      .gte('transaction_date', `${from}-01`)
      .lt('transaction_date', nextM)
      .order('transaction_date')
    setTxns((data as Transaction[]) ?? [])
    setLoading(false)
  }

  function applyQuick(n: QuickRange) {
    setQuickRange(n)
    setIsCustom(false)
    setFromMonth(monthsBack(n))
    setToMonth(currentMonth())
  }

  const months = useMemo(() => buildMonthRange(fromMonth, toMonth), [fromMonth, toMonth])

  const cardTypeMap = useMemo(() => {
    const m = new Map<string, 'miles' | 'cashback' | 'debit'>()
    for (const c of allCards) m.set(c.id, c.card_type)
    return m
  }, [allCards])

  // Chart 1
  const spendData = useMemo(() => months.map(mk => {
    const mt = txns.filter(t => t.transaction_date.startsWith(mk))
    return {
      month: shortLabel(mk),
      'Miles':    r2(mt.filter(t => cardTypeMap.get(t.card_id ?? '') === 'miles')   .reduce((s, t) => s + t.amount, 0)),
      'Cashback': r2(mt.filter(t => cardTypeMap.get(t.card_id ?? '') === 'cashback').reduce((s, t) => s + t.amount, 0)),
      'Debit':    r2(mt.filter(t => cardTypeMap.get(t.card_id ?? '') === 'debit')   .reduce((s, t) => s + t.amount, 0)),
    }
  }), [months, txns, cardTypeMap])

  // Chart 2
  const rewardsData = useMemo(() => months.map(mk => {
    const mt = txns.filter(t => t.transaction_date.startsWith(mk))
    return {
      month: shortLabel(mk),
      Miles:           Math.round(mt.reduce((s, t) => s + (t.miles_earned    ?? 0), 0)),
      'Cashback (S$)': r2(        mt.reduce((s, t) => s + (t.cashback_earned ?? 0), 0)),
    }
  }), [months, txns])

  const hasMiles    = rewardsData.some(d => d.Miles > 0)
  const hasCashback = rewardsData.some(d => d['Cashback (S$)'] > 0)

  // Chart 3
  const { topCats, catData } = useMemo(() => {
    const totals = new Map<string, number>()
    for (const t of txns) {
      if (!t.category_id) continue
      totals.set(t.category_id, (totals.get(t.category_id) ?? 0) + t.amount)
    }
    const topCats = Array.from(totals.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([catId]) => ({ catId, label: categories.find(c => c.id === catId)?.name ?? '—' }))

    const catData = months.map(mk => {
      const mt = txns.filter(t => t.transaction_date.startsWith(mk))
      const row: Record<string, string | number> = { month: shortLabel(mk) }
      for (const { catId, label } of topCats) {
        row[label] = r2(mt.filter(t => t.category_id === catId).reduce((s, t) => s + t.amount, 0))
      }
      return row
    })
    return { topCats, catData }
  }, [months, txns, categories])

  const maxMonth = currentMonth()

  // Responsive chart config
  const xProps = {
    dataKey: 'month',
    tick: { fontSize: isMobile ? 10 : 12, fill: '#9ca3af' },
    angle: isMobile ? -40 : 0,
    textAnchor: (isMobile ? 'end' : 'middle') as 'end' | 'middle',
    height: isMobile ? 52 : 25,
    axisLine: false as const,
    tickLine: false as const,
  }
  const yProps = {
    tick: { fontSize: 10, fill: '#9ca3af' },
    axisLine: false as const,
    tickLine: false as const,
    tickFormatter: fmtY,
    width: isMobile ? 34 : 48,
  }
  const legendProps = {
    verticalAlign: (isMobile ? 'top' : 'bottom') as 'top' | 'bottom',
    iconSize: isMobile ? 8 : 10,
    wrapperStyle: { fontSize: isMobile ? 10 : 12, paddingBottom: isMobile ? 4 : 0, paddingTop: isMobile ? 0 : 0 },
  }
  const chartH    = 280
  const barGap    = isMobile ? 2 : 3
  const catGap    = isMobile ? '12%' : '28%'

  return (
    <div className="space-y-5">
      {/* Range filter */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide shrink-0">Range</span>
        <div className="flex gap-1.5 flex-wrap">
          {([3, 6, 12] as QuickRange[]).map(n => (
            <button
              key={n}
              onClick={() => applyQuick(n)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                !isCustom && quickRange === n
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {n}M
            </button>
          ))}
          <button
            onClick={() => setIsCustom(true)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              isCustom ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Custom
          </button>
        </div>

        {isCustom && (
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="month"
              value={fromMonth}
              max={toMonth}
              onChange={e => setFromMonth(e.target.value)}
              className="input text-xs py-1"
            />
            <span className="text-gray-400 text-xs">to</span>
            <input
              type="month"
              value={toMonth}
              min={fromMonth}
              max={maxMonth}
              onChange={e => setToMonth(e.target.value)}
              className="input text-xs py-1"
            />
          </div>
        )}

        {loading && <RefreshCw size={14} className="animate-spin text-gray-400 ml-auto" />}
      </div>

      {!loading && txns.length === 0 ? (
        <div className="card p-10 text-center text-gray-400">
          <p className="font-medium">No transactions in this period.</p>
        </div>
      ) : (
        <>
          {/* Chart 1: Spend by card type */}
          <div className="card p-4 sm:p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Monthly Spend by Card Type</h2>
            <ResponsiveContainer width="100%" height={chartH}>
              <BarChart data={spendData} barGap={barGap} barCategoryGap={catGap}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis {...xProps} />
                <YAxis {...yProps} />
                <Tooltip
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(v: any) => [`S$${Number(v).toFixed(2)}`]}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                />
                <Legend {...legendProps} />
                <Bar dataKey="Miles"    fill="#6366f1" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Cashback" fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Debit"    fill="#94a3b8" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Chart 2: Rewards earned */}
          {(hasMiles || hasCashback) && (
            <div className="card p-4 sm:p-5">
              <h2 className="font-semibold text-gray-800 mb-1">Rewards Earned</h2>
              {hasMiles && hasCashback && (
                <p className="text-xs text-gray-400 mb-3">Miles — left axis &nbsp;·&nbsp; Cashback (S$) — right axis</p>
              )}
              {!(hasMiles && hasCashback) && <div className="mb-3" />}
              <ResponsiveContainer width="100%" height={chartH}>
                <BarChart data={rewardsData} barGap={barGap} barCategoryGap={catGap}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis {...xProps} />
                  {hasMiles && (
                    <YAxis
                      yAxisId="miles"
                      orientation="left"
                      tick={{ fontSize: 10, fill: '#9ca3af' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                      width={isMobile ? 34 : 44}
                    />
                  )}
                  {hasCashback && (
                    <YAxis
                      yAxisId="cashback"
                      orientation={hasMiles ? 'right' : 'left'}
                      tick={{ fontSize: 10, fill: '#9ca3af' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={fmtY}
                      width={isMobile ? 34 : 44}
                    />
                  )}
                  <Tooltip
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(v: any, name: any) =>
                      name === 'Miles'
                        ? [`${Number(v).toLocaleString()} mi`, 'Miles']
                        : [`S$${Number(v).toFixed(2)}`, 'Cashback']
                    }
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                  />
                  <Legend {...legendProps} />
                  {hasMiles    && <Bar yAxisId="miles"    dataKey="Miles"         fill="#6366f1" radius={[3, 3, 0, 0]} />}
                  {hasCashback && <Bar yAxisId="cashback" dataKey="Cashback (S$)" fill="#10b981" radius={[3, 3, 0, 0]} />}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Chart 3: Top categories */}
          {topCats.length > 0 && (
            <div className="card p-4 sm:p-5">
              <h2 className="font-semibold text-gray-800 mb-3">Top Categories by Month</h2>
              <ResponsiveContainer width="100%" height={chartH}>
                <BarChart data={catData} barGap={barGap} barCategoryGap={catGap}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis {...xProps} />
                  <YAxis {...yProps} />
                  <Tooltip
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(v: any) => [`S$${Number(v).toFixed(2)}`]}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                  />
                  <Legend {...legendProps} />
                  {topCats.map(({ label }, i) => (
                    <Bar key={label} dataKey={label} fill={CAT_COLORS[i % CAT_COLORS.length]} radius={[3, 3, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  )
}
