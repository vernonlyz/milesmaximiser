import { useMemo } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Sparkles, TrendingUp, Receipt, RefreshCw, AlertCircle, Target, Wallet, Percent } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import CapUsageBar from '../components/CapUsageBar'
import { SpendingCap } from '../lib/types'
import { buildPeriodSpending, resolveCaps, applyAllSelectableOverrides, resolveOverride } from '../lib/recommendations'
import { currentMonthLabel, getPeriodLabel, getPeriodEnd, formatSGD } from '../lib/utils'
import { isOnboarded } from './Onboarding'

export default function Dashboard() {
  const { cards, allCards, selectedCardIds, categories, rates, caps, overrides, transactions, statementDays, loading, error, refresh } = useApp()
  const { user } = useAuth()

  // Only redirect brand-new users who have never been through onboarding.
  // Existing users (isOnboarded flag set) stay on the dashboard even if
  // their wallet is empty after the library migration — they see an empty state instead.
  if (!loading && user && cards.length === 0 && !isOnboarded(user.id)) {
    return <Navigate to="/onboarding" replace />
  }

  const now = new Date()

  // Transactions in current month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const monthTxns = transactions.filter(t => t.transaction_date >= monthStart)

  const totalSpent = monthTxns.reduce((s, t) => s + t.amount, 0)
  const totalMiles = monthTxns.reduce((s, t) => s + (t.miles_earned ?? 0), 0)
  const totalCashback = monthTxns.reduce((s, t) => s + (t.cashback_earned ?? 0), 0)
  const txnCount = monthTxns.length

  // Spend by card type (look up from allCards so removed-wallet cards still resolve)
  const cardTypeMap = useMemo(() => {
    const m = new Map<string, 'miles' | 'cashback' | 'debit'>()
    for (const c of allCards) m.set(c.id, c.card_type)
    return m
  }, [allCards])

  const milesSpend    = monthTxns.filter(t => t.card_id && cardTypeMap.get(t.card_id) === 'miles')   .reduce((s, t) => s + t.amount, 0)
  const cashbackSpend = monthTxns.filter(t => t.card_id && cardTypeMap.get(t.card_id) === 'cashback').reduce((s, t) => s + t.amount, 0)
  const debitSpend    = monthTxns.filter(t => t.card_id && cardTypeMap.get(t.card_id) === 'debit')   .reduce((s, t) => s + t.amount, 0)

  // Spend by category (calendar month, all card types)
  const catSpend = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of monthTxns) {
      if (!t.category_id) continue
      map.set(t.category_id, (map.get(t.category_id) ?? 0) + t.amount)
    }
    return Array.from(map.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([catId, amt]) => ({ catId, amt, cat: categories.find(c => c.id === catId) }))
  }, [monthTxns, categories])

  // Only show caps for cards in the user's wallet
  const walletCaps = useMemo(
    () => caps.filter(c => selectedCardIds.has(c.card_id)),
    [caps, selectedCardIds]
  )

  // Resolve effective caps for today, then apply any selectable-category overrides.
  // This ensures Lady's Card / Solitaire cap bars track the user's chosen categories,
  // not the library's Dining default.
  const resolvedCaps = useMemo(() => resolveCaps(walletCaps, now), [walletCaps])
  const effectiveCaps = useMemo(
    () => applyAllSelectableOverrides(cards, rates, resolvedCaps, overrides, now).caps,
    [cards, rates, resolvedCaps, overrides]
  )

  const periodSpending = useMemo(
    () => buildPeriodSpending(transactions, effectiveCaps, now, statementDays),
    [transactions, effectiveCaps, statementDays]
  )

  // Min spend milestones — wallet cards that have a threshold requirement
  const milestones = useMemo(() => {
    const seen = new Set<string>()
    const result: Array<{
      card: typeof cards[number]
      minSpend: number
      totalSpent: number
      capPeriod: string
      daysLeft: number
    }> = []

    for (const cap of effectiveCaps) {
      if (cap.min_spend == null || cap.cap_period === 'per_transaction') continue
      const key = `${cap.card_id}:${cap.cap_period}`
      if (seen.has(key)) continue
      seen.add(key)

      const card = cards.find(c => c.id === cap.card_id)
      if (!card) continue

      const totalSpent = periodSpending.get(`${cap.card_id}:total:${cap.cap_period}`) ?? 0

      const statementDay = statementDays.get(cap.card_id)
      const periodEnd = getPeriodEnd(cap.cap_period, now, statementDay)
      const daysLeft = Math.max(1, Math.ceil((periodEnd.getTime() - now.getTime()) / 86400000))

      result.push({ card, minSpend: cap.min_spend, totalSpent, capPeriod: cap.cap_period, daysLeft })
    }

    // Most progress (closest to threshold) first
    return result.sort((a, b) => (b.totalSpent / b.minSpend) - (a.totalSpent / a.minSpend))
  }, [effectiveCaps, cards, periodSpending])

  // Build per-card summary
  const cardSummaries = useMemo(() => {
    return cards.map(card => {
      // Cap bars — use effective caps so selectable cards show correct categories.
      // Combined-cap cards (cap_group != null) are collapsed into one bar per group.
      const rawCardCaps = effectiveCaps.filter(
        c => c.card_id === card.id && c.cap_period !== 'per_transaction' && (c.spend_limit ?? 0) > 0
      )

      const capGroupMap = new Map<string, SpendingCap[]>()
      for (const cap of rawCardCaps) {
        const key = cap.cap_group ? `group:${cap.cap_group}` : `single:${cap.id}`
        const list = capGroupMap.get(key) ?? []
        list.push(cap)
        capGroupMap.set(key, list)
      }

      const capRows = Array.from(capGroupMap.values()).map(groupCaps => {
        const firstCap = groupCaps[0]
        if (firstCap.cap_group) {
          // Combined cap: sum spending across all group categories
          const groupSpentKey = `${firstCap.card_id}:group:${firstCap.cap_group}`
          const spent = periodSpending.get(groupSpentKey) ?? 0
          const catLabels = groupCaps
            .map(c => {
              const cat = c.category_id ? categories.find(cat => cat.id === c.category_id) : null
              return cat ? `${cat.icon} ${cat.name}` : ''
            })
            .filter(Boolean)
            .join(' · ')
          return {
            key: groupSpentKey,
            label: catLabels || 'Combined cap',
            spent,
            limit: firstCap.spend_limit ?? 0,
            period: getPeriodLabel(firstCap.cap_period),
            catIds: groupCaps.map(c => c.category_id).filter(Boolean) as string[],
          }
        }
        const cat = firstCap.category_id ? categories.find(c => c.id === firstCap.category_id) : null
        const spentKey = firstCap.cap_payment_channel
          ? `${firstCap.card_id}:channel:${firstCap.cap_payment_channel}:${firstCap.cap_period}`
          : `${firstCap.card_id}:${firstCap.category_id ?? 'global'}`
        const label = firstCap.cap_payment_channel === 'contactless'
          ? 'Tap to pay'
          : firstCap.cap_payment_channel === 'online'
            ? 'Online'
            : cat ? `${cat.icon} ${cat.name}` : 'All spend'
        const spent = periodSpending.get(spentKey) ?? 0
        return {
          key: firstCap.id,
          label,
          spent,
          limit: firstCap.spend_limit ?? 0,
          period: getPeriodLabel(firstCap.cap_period),
          catIds: firstCap.category_id ? [firstCap.category_id] : [],
        }
      }).sort((a, b) => (b.spent / b.limit) - (a.spent / a.limit))

      const monthlySpent = monthTxns
        .filter(t => t.card_id === card.id)
        .reduce((s, t) => s + t.amount, 0)

      const monthlyMiles = monthTxns
        .filter(t => t.card_id === card.id)
        .reduce((s, t) => s + (t.miles_earned ?? 0), 0)

      // Uncapped spend breakdown — all categories used this month that don't already
      // have a cap bar. For selectable cards, the chosen categories appear first.
      const coveredCatIds = new Set(capRows.flatMap(r => r.catIds))

      // Tally per-category spend for this card this month
      const catTotals = new Map<string, number>()
      for (const t of monthTxns) {
        if (t.card_id !== card.id || !t.category_id) continue
        if (coveredCatIds.has(t.category_id)) continue
        catTotals.set(t.category_id, (catTotals.get(t.category_id) ?? 0) + t.amount)
      }

      // For selectable cards, pin chosen categories to the top (even if S$0 this month)
      const pinnedCatIds = card.selectable_category
        ? (resolveOverride(overrides, card.id, now) ?? []).filter(id => !coveredCatIds.has(id))
        : []

      const spendRows = [
        // Pinned chosen categories first
        ...pinnedCatIds.map(catId => {
          const cat = categories.find(c => c.id === catId)
          return { key: `pin:${card.id}:${catId}`, catId, label: cat ? `${cat.icon} ${cat.name}` : '—', spent: catTotals.get(catId) ?? 0, pinned: true }
        }),
        // All other categories with actual spend, sorted by amount desc
        ...Array.from(catTotals.entries())
          .filter(([catId]) => !pinnedCatIds.includes(catId))
          .sort(([, a], [, b]) => b - a)
          .map(([catId, spent]) => {
            const cat = categories.find(c => c.id === catId)
            return { key: `cat:${card.id}:${catId}`, catId, label: cat ? `${cat.icon} ${cat.name}` : '—', spent, pinned: false }
          }),
      ]

      return { card, capRows, spendRows, monthlySpent, monthlyMiles }
    })
  }, [cards, effectiveCaps, categories, periodSpending, monthTxns, overrides])

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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Stat
          icon={<TrendingUp size={20} className="text-indigo-600" />}
          label="Miles Earned"
          value={Math.round(totalMiles).toLocaleString()}
          sub="this month"
          bg="bg-indigo-50"
        />
        <Stat
          icon={<Percent size={20} className="text-emerald-600" />}
          label="Cashback Earned"
          value={`S$${totalCashback.toFixed(2)}`}
          sub="this month"
          bg="bg-emerald-50"
        />
        <Stat
          icon={<Receipt size={20} className="text-sky-600" />}
          label="Total Spent"
          value={`S$${totalSpent.toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          sub="this month"
          bg="bg-sky-50"
        />
        <Stat
          icon={<Sparkles size={20} className="text-amber-600" />}
          label="Transactions"
          value={txnCount.toString()}
          sub="this month"
          bg="bg-amber-50"
        />
      </div>

      {/* Spending Overview */}
      {monthTxns.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Wallet size={16} className="text-gray-600" />
            <h2 className="font-semibold text-gray-800">Spending Overview</h2>
            <span className="text-xs text-gray-400 ml-1">{currentMonthLabel()}</span>
          </div>

          {/* Spend by type */}
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm mb-5 pb-4 border-b border-gray-100">
            <span className="text-gray-500">Miles cards <span className="font-semibold text-gray-800 ml-1">{formatSGD(milesSpend)}</span></span>
            <span className="text-gray-500">Cashback cards <span className="font-semibold text-gray-800 ml-1">{formatSGD(cashbackSpend)}</span></span>
            <span className="text-gray-500">Cash / Debit <span className="font-semibold text-gray-800 ml-1">{formatSGD(debitSpend)}</span></span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-500">Total <span className="font-bold text-gray-900 ml-1">{formatSGD(totalSpent)}</span></span>
          </div>

          {/* Spend by category */}
          {catSpend.length > 0 && (
            <div className="space-y-2.5">
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
                      <div
                        className="h-full rounded-full bg-indigo-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Spend milestones — cards with min spend thresholds */}
      {milestones.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target size={16} className="text-indigo-600" />
            <h2 className="font-semibold text-gray-800">Spend Milestones</h2>
            <span className="text-xs text-gray-400">unlock bonus miles by hitting min spend</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {milestones.map(m => {
              const pct = Math.min((m.totalSpent / m.minSpend) * 100, 100)
              const remaining = Math.max(0, m.minSpend - m.totalSpent)
              const met = remaining === 0
              const periodLabel = m.capPeriod.replace('ly', '')
              return (
                <div key={`${m.card.id}:${m.capPeriod}`} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded text-white text-[8px] font-bold flex items-center justify-center shrink-0"
                      style={{ backgroundColor: m.card.color }}
                    >
                      {m.card.bank.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-gray-700 truncate">
                      {m.card.bank} {m.card.name}
                    </span>
                    {met ? (
                      <span className="ml-auto text-xs font-medium text-emerald-600 shrink-0">Unlocked</span>
                    ) : (
                      <span className="ml-auto text-xs text-gray-400 shrink-0">{m.daysLeft}d left</span>
                    )}
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${met ? 'bg-emerald-400' : 'bg-indigo-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className={met ? 'text-emerald-600 font-medium' : 'text-gray-500'}>
                      {met
                        ? `Bonus unlocked this ${periodLabel}`
                        : `${formatSGD(remaining)} more to unlock bonus`}
                    </span>
                    <span className="text-gray-400 tabular-nums">
                      {formatSGD(m.totalSpent)} / {formatSGD(m.minSpend)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Wallet cards with cap usage */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4">My Wallet</h2>
          {cardSummaries.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-gray-400">No cards in your wallet yet.</p>
              <Link to="/cards" className="btn-primary mt-3 text-xs">Go to My Cards</Link>
            </div>
          ) : (
            <div className="space-y-5">
              {cardSummaries.map(({ card, capRows, spendRows, monthlySpent, monthlyMiles }) => (
                <div key={card.id}>
                  {/* Card name row */}
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                      style={{ backgroundColor: card.color }}
                    >
                      {card.bank.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {card.bank} {card.name}
                    </span>
                    <span className="ml-auto text-xs text-gray-400 shrink-0">
                      {card.cap_cycle === 'statement' && statementDays.has(card.id)
                        ? `Stmt day ${statementDays.get(card.id)}`
                        : 'Calendar Mth'}
                    </span>
                  </div>
                  <div className="pl-7 space-y-3">
                    {/* Cap bars for capped categories */}
                    {capRows.map(row => (
                      <CapUsageBar
                        key={row.key}
                        label={row.label}
                        spent={row.spent}
                        limit={row.limit}
                        period={row.period}
                      />
                    ))}

                    {/* Proportional spend bars for uncapped categories */}
                    {spendRows.filter(r => r.spent > 0 || r.pinned).map(row => {
                      const pct = monthlySpent > 0 ? (row.spent / monthlySpent) * 100 : 0
                      return (
                        <div key={row.key}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className={row.pinned && row.spent === 0 ? 'text-gray-400' : 'text-gray-600'}>
                              {row.label}
                              {row.pinned && row.spent === 0 && <span className="ml-1 text-gray-300">· no spend yet</span>}
                            </span>
                            <span className="text-gray-500 tabular-nums">
                              {row.spent > 0 ? `S$${row.spent.toFixed(2)}` : '—'}
                              {row.spent > 0 && monthlySpent > 0 && (
                                <span className="text-gray-300 ml-1">{Math.round(pct)}%</span>
                              )}
                            </span>
                          </div>
                          {row.spent > 0 && (
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-indigo-200"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {/* Monthly total row */}
                    <div className="flex items-center justify-between text-xs pt-0.5">
                      <span className="text-gray-400">
                        {capRows.length > 0 ? 'Total this month' : 'No cap · total this month'}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-600 font-medium">
                          S${monthlySpent.toFixed(2)}
                        </span>
                        {monthlyMiles > 0 && (
                          <span className="text-indigo-600 font-medium">
                            +{Math.round(monthlyMiles).toLocaleString()} miles
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
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
                const primaryLabel = t.vendor_name || t.description || cat?.name || '—'
                const notesLine = t.vendor_name && t.description ? t.description : null
                return (
                  <div key={t.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                    <span className="text-lg leading-none">{cat?.icon ?? '💳'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {primaryLabel}
                      </p>
                      {notesLine && (
                        <p className="text-xs text-gray-500 truncate">{notesLine}</p>
                      )}
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
