import { useMemo } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Sparkles, TrendingUp, Receipt, RefreshCw, AlertCircle } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import CapUsageBar from '../components/CapUsageBar'
import { buildPeriodSpending } from '../lib/recommendations'
import { currentMonthLabel, getPeriodLabel } from '../lib/utils'
import { isOnboarded } from './Onboarding'

export default function Dashboard() {
  const { cards, categories, caps, transactions, loading, error, refresh } = useApp()
  const { user } = useAuth()

  // First-time user with no cards → send to onboarding
  if (!loading && user && cards.length === 0 && !isOnboarded(user.id)) {
    return <Navigate to="/onboarding" replace />
  }

  const now = new Date()

  // Transactions in current month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const monthTxns = transactions.filter(t => t.transaction_date >= monthStart)

  const totalSpent = monthTxns.reduce((s, t) => s + t.amount, 0)
  const totalMiles = monthTxns.reduce((s, t) => s + (t.miles_earned ?? 0), 0)
  const txnCount = monthTxns.length

  // Period spending for all caps
  const periodSpending = useMemo(
    () => buildPeriodSpending(transactions, caps, now),
    [transactions, caps]
  )

  // Build cap usage rows
  const capRows = useMemo(() => {
    return caps
      .filter(c => c.cap_period !== 'per_transaction')
      .map(cap => {
        const card = cards.find(c => c.id === cap.card_id)
        const category = cap.category_id ? categories.find(c => c.id === cap.category_id) : null
        const key = `${cap.card_id}:${cap.category_id ?? 'global'}`
        const spent = periodSpending.get(key) ?? 0
        const label = card
          ? `${card.bank} ${card.name}${category ? ` · ${category.name}` : ''}`
          : 'Unknown Card'
        return { key: cap.id, label, spent, limit: cap.spend_limit, period: getPeriodLabel(cap.cap_period) }
      })
      .sort((a, b) => (b.spent / b.limit) - (a.spent / a.limit))
  }, [caps, cards, categories, periodSpending])

  // Recent transactions (last 8)
  const recent = transactions.slice(0, 8)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <RefreshCw size={24} className="animate-spin mr-2" /> Loading…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
        <AlertCircle size={32} className="text-red-400" />
        <div>
          <p className="font-medium text-gray-800">Could not connect to Supabase</p>
          <p className="text-sm text-gray-500 mt-1 max-w-sm">{error}</p>
          <p className="text-xs text-gray-400 mt-2">Make sure your <code>.env</code> file has the correct <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>.</p>
        </div>
        <button onClick={refresh} className="btn-secondary">
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">{currentMonthLabel()}</p>
        </div>
        <button onClick={refresh} className="btn-secondary text-xs">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat
          icon={<TrendingUp size={20} className="text-indigo-600" />}
          label="Miles Earned"
          value={Math.round(totalMiles).toLocaleString()}
          sub="this month"
          bg="bg-indigo-50"
        />
        <Stat
          icon={<Receipt size={20} className="text-emerald-600" />}
          label="Total Spent"
          value={`S$${totalSpent.toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          sub="this month"
          bg="bg-emerald-50"
        />
        <Stat
          icon={<Sparkles size={20} className="text-amber-600" />}
          label="Transactions"
          value={txnCount.toString()}
          sub="this month"
          bg="bg-amber-50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cap usage */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Cap Usage</h2>
          {capRows.length === 0 ? (
            <p className="text-sm text-gray-400">No spending caps configured yet.</p>
          ) : (
            <div className="space-y-5">
              {capRows.map(row => (
                <CapUsageBar
                  key={row.key}
                  label={row.label}
                  spent={row.spent}
                  limit={row.limit}
                  period={row.period}
                />
              ))}
            </div>
          )}
        </div>

        {/* Recent transactions */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Recent Transactions</h2>
            <Link to="/transactions" className="text-xs text-indigo-600 hover:underline">View all</Link>
          </div>
          {recent.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-400">No transactions yet.</p>
              <Link to="/transactions" className="btn-primary mt-3 text-xs">
                <Receipt size={13} /> Log first transaction
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recent.map(t => {
                const card = cards.find(c => c.id === t.card_id)
                const cat = categories.find(c => c.id === t.category_id)
                return (
                  <div key={t.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                    <span className="text-lg leading-none">{cat?.icon ?? '💳'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {t.description || cat?.name || '—'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {t.transaction_date} · {card ? `${card.bank} ${card.name}` : 'No card'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-gray-800">
                        S${t.amount.toFixed(2)}
                      </p>
                      {t.miles_earned != null && (
                        <p className="text-xs text-indigo-600">+{Math.round(t.miles_earned)} mi</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Empty state CTA */}
      {cards.length === 0 && (
        <div className="card p-8 text-center border-dashed border-2 border-gray-300">
          <p className="font-medium text-gray-600">No cards set up yet</p>
          <p className="text-sm text-gray-400 mt-1">Add your credit cards to start tracking miles and getting recommendations.</p>
          <Link to="/cards" className="btn-primary mt-4">Go to My Cards</Link>
        </div>
      )}
    </div>
  )
}

function Stat({ icon, label, value, sub, bg }: {
  icon: React.ReactNode; label: string; value: string; sub: string; bg: string
}) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
        <p className="text-xs text-gray-400">{sub}</p>
      </div>
    </div>
  )
}
