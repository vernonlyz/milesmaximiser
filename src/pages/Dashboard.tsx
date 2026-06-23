import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Sparkles, TrendingUp, Receipt, RefreshCw, AlertCircle, Target, Percent, Plus, CalendarClock, Repeat } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import CapUsageBar from '../components/CapUsageBar'
import { SpendingCap, Transaction, TransactionFavourite } from '../lib/types'
import { supabase } from '../lib/supabase'
import { buildPeriodSpending, resolveCaps, applyAllSelectableOverrides, resolveOverride } from '../lib/recommendations'
import { currentMonthLabel, getPeriodLabel, getPeriodStart, getPeriodEnd, formatSGD } from '../lib/utils'
import { isOnboarded, markOnboarded } from './Onboarding'

export default function Dashboard() {
  const { cards, allCards, selectedCardIds, categories, rates, caps, overrides, transactions, statementDays, loading, error, refresh } = useApp()
  const { user } = useAuth()
  const navigate = useNavigate()

  // Use Supabase-backed signals (cards, transactions) as cross-device proof of an existing user.
  // localStorage isOnboarded is device/domain scoped and can't be trusted alone on mobile or
  // after a domain change. If either cards or transactions exist in Supabase, skip onboarding.
  const hasActivity = cards.length > 0 || transactions.length > 0

  useEffect(() => {
    if (!loading && user && hasActivity && !isOnboarded(user.id)) {
      markOnboarded(user.id)
    }
  }, [loading, user, hasActivity])

  // Recurring favourites due to log (next_due within the next 7 days, or overdue)
  const [dueRecurring, setDueRecurring] = useState<TransactionFavourite[]>([])
  useEffect(() => {
    let cancelled = false
    supabase.from('transaction_favourites').select('*').eq('recurrence', 'monthly')
      .then(({ data }) => {
        if (cancelled) return
        const horizon = new Date(); horizon.setDate(horizon.getDate() + 7)
        const horizonStr = horizon.toLocaleDateString('en-CA')
        const due = ((data as TransactionFavourite[]) ?? [])
          .filter(f => f.next_due_date && f.next_due_date <= horizonStr)
          .sort((a, b) => (a.next_due_date ?? '').localeCompare(b.next_due_date ?? ''))
        setDueRecurring(due)
      })
    return () => { cancelled = true }
  }, [])

  // allCards is always non-empty after a successful library load.
  // If it is empty, data has not yet arrived for this user — do not redirect.
  const dataLoaded = allCards.length > 0

  // Only redirect if data has fully loaded, there is no error, and the user has
  // no activity in Supabase and no onboarded flag in localStorage.
  if (!loading && dataLoaded && !error && user && !hasActivity && !isOnboarded(user.id)) {
    return <Navigate to="/onboarding" replace />
  }

  const now = new Date()

  // Transactions in current calendar month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
  const monthTxns = transactions.filter(t => t.transaction_date >= monthStart && t.transaction_date <= monthEnd)

  const totalSpent      = monthTxns.reduce((s, t) => s + t.amount, 0)
  const myActualSpent   = monthTxns.reduce((s, t) => s + (t.personal_amount ?? t.amount), 0)
  const totalMiles      = monthTxns.reduce((s, t) => s + (t.miles_earned ?? 0), 0)
  const totalCashback   = monthTxns.reduce((s, t) => s + (t.cashback_earned ?? 0), 0)
  const txnCount        = monthTxns.length

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

      // Use the card's billing cycle bounds for per-card stats and category breakdown,
      // so statement-cycle cards don't bleed in spend from the previous cycle.
      const cardStatDay = card.cap_cycle === 'statement' ? statementDays.get(card.id) : undefined
      const cardPeriodStart = getPeriodStart('monthly', now, cardStatDay)
      const cardPeriodEnd   = getPeriodEnd('monthly', now, cardStatDay)
      const cardTxns = transactions.filter(t => {
        if (t.card_id !== card.id) return false
        const d = new Date(t.transaction_date)
        return d >= cardPeriodStart && d <= cardPeriodEnd
      })

      const monthlySpent = cardTxns.reduce((s, t) => s + t.amount, 0)
      const monthlyMiles = cardTxns.reduce((s, t) => s + (t.miles_earned ?? 0), 0)

      // Uncapped spend breakdown — all categories used this period that don't already
      // have a cap bar. For selectable cards, the chosen categories appear first.
      const coveredCatIds = new Set(capRows.flatMap(r => r.catIds))

      // Tally per-category spend for this card this billing period
      const catTotals = new Map<string, number>()
      for (const t of cardTxns) {
        if (!t.category_id) continue
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
  }, [cards, effectiveCaps, categories, periodSpending, transactions, statementDays, overrides])

  // Wallet filter
  const [walletFilter, setWalletFilter] = useState<string>('all')

  const walletBanks = useMemo(
    () => Array.from(new Set(cards.map(c => c.bank))).sort(),
    [cards]
  )
  const hasMultipleTypes = useMemo(
    () => new Set(cards.map(c => c.card_type)).size > 1,
    [cards]
  )

  // Debit spend this month (Cash/Debit is never a wallet card)
  const debitMonthlySpent = useMemo(() => {
    const debitIds = new Set(allCards.filter(c => c.card_type === 'debit').map(c => c.id))
    return monthTxns.filter(t => t.card_id && debitIds.has(t.card_id)).reduce((s, t) => s + t.amount, 0)
  }, [allCards, monthTxns])

  const showDebitRow = walletFilter === 'all' || walletFilter === 'cash'

  const visibleSummaries = useMemo(() => {
    if (walletFilter === 'all' || walletFilter === 'cash') return walletFilter === 'cash' ? [] : cardSummaries
    if (walletFilter === 'miles' || walletFilter === 'cashback')
      return cardSummaries.filter(s => s.card.card_type === walletFilter)
    return cardSummaries.filter(s => s.card.bank === walletFilter)
  }, [cardSummaries, walletFilter])

  // Split logged transactions into upcoming (future-dated) and recent (today or earlier).
  // transactions arrives newest-first, so future dates would otherwise crowd out recent ones.
  const todayStr = new Date().toLocaleDateString('en-CA')
  const upcoming = transactions
    .filter(t => t.transaction_date > todayStr)
    .sort((a, b) => a.transaction_date.localeCompare(b.transaction_date))
  const recent = transactions.filter(t => t.transaction_date <= todayStr).slice(0, 8)

  function relDays(dateStr: string) {
    const days = Math.round(
      (new Date(dateStr + 'T00:00:00').getTime() - new Date(todayStr + 'T00:00:00').getTime()) / 86400000
    )
    return days <= 1 ? 'tomorrow' : `in ${days} days`
  }

  // Recurring due-date label and actions
  function dueLabel(dateStr: string) {
    const days = Math.round(
      (new Date(dateStr + 'T00:00:00').getTime() - new Date(todayStr + 'T00:00:00').getTime()) / 86400000
    )
    if (days < 0) return `overdue ${-days}d`
    if (days === 0) return 'due today'
    if (days === 1) return 'tomorrow'
    return `in ${days} days`
  }

  function confirmRecurring(f: TransactionFavourite) {
    navigate('/transactions', { state: { favourite: f, dueDate: f.next_due_date, recurringFavId: f.id } })
  }

  async function skipRecurring(f: TransactionFavourite) {
    if (!f.next_due_date) return
    const [y, m, dd] = f.next_due_date.split('-').map(Number)
    const next = new Date(y, m, dd) // m is 1-based → index m = next month
    const pad = (n: number) => String(n).padStart(2, '0')
    const nextStr = `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`
    await supabase.from('transaction_favourites').update({ next_due_date: nextStr }).eq('id', f.id)
    setDueRecurring(prev => prev.filter(x => x.id !== f.id))
  }

  function txnRow(t: Transaction) {
    const card = cards.find(c => c.id === t.card_id) ?? allCards.find(c => c.id === t.card_id)
    const cat = categories.find(c => c.id === t.category_id)
    const primaryLabel = t.vendor_name || t.description || cat?.name || '—'
    const notesLine = t.vendor_name && t.description ? t.description : null
    const isUpcoming = t.transaction_date > todayStr
    return (
      <div key={t.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
        <span className="text-lg leading-none">{cat?.icon ?? '💳'}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate flex items-center gap-1.5">
            <span className="truncate">{primaryLabel}</span>
            {isUpcoming && (
              <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full shrink-0">
                {relDays(t.transaction_date)}
              </span>
            )}
          </p>
          {notesLine && <p className="text-xs text-gray-500 truncate">{notesLine}</p>}
          <p className="text-xs text-gray-500">
            {t.transaction_date} · {card ? (card.card_type === 'debit' ? card.name : `${card.bank} ${card.name}`) : 'No card'}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-semibold text-gray-800">S${t.amount.toFixed(2)}</p>
          {t.miles_earned != null && (
            <p className="text-xs text-indigo-600">+{Math.round(t.miles_earned)} mi</p>
          )}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
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
          <p className="text-xs text-gray-500 mt-2">Make sure your <code>.env</code> file has the correct <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>.</p>
        </div>
        <button onClick={refresh} className="btn-secondary">
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">{currentMonthLabel()}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/transactions', { state: { openModal: true } })}
            className="btn-primary text-xs"
          >
            <Plus size={14} /> Log Transaction
          </button>
          <button onClick={refresh} className="hidden sm:inline-flex btn-secondary text-xs">
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
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
          sub={myActualSpent < totalSpent
            ? `S$${myActualSpent.toFixed(2)} yours · ${txnCount} txns`
            : `${txnCount} transactions`}
          bg="bg-sky-50"
        />
      </div>

      {/* Spend milestones — cards with min spend thresholds */}
      {milestones.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target size={16} className="text-indigo-600" />
            <h2 className="font-semibold text-gray-800">Spend Milestones</h2>
            <span className="text-xs text-gray-500">unlock bonus miles by hitting min spend</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-5">
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
                      <span className="ml-auto text-xs text-gray-500 shrink-0">{m.daysLeft}d left</span>
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
                    <span className="text-gray-500 tabular-nums">
                      {formatSGD(m.totalSpent)} / {formatSGD(m.minSpend)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recurring charges due to log */}
      {dueRecurring.length > 0 && (
        <div className="card p-5 border-indigo-200">
          <h2 className="font-semibold text-gray-800 mb-0.5 flex items-center gap-1.5">
            <Repeat size={15} className="text-indigo-500" /> Recurring — due to log
          </h2>
          <p className="text-xs text-gray-500 mb-3">Confirm to log each charge (amount editable), or skip if it didn't happen.</p>
          <div className="space-y-2">
            {dueRecurring.map(f => {
              const card = cards.find(c => c.id === f.card_id) ?? allCards.find(c => c.id === f.card_id)
              const cat = categories.find(c => c.id === f.category_id)
              return (
                <div key={f.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <span className="text-lg leading-none">{cat?.icon ?? '🔁'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{f.label}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {f.next_due_date} · {dueLabel(f.next_due_date!)}
                      {f.amount != null ? ` · S$${f.amount.toFixed(2)}` : ' · amount varies'}
                      {card ? ` · ${card.card_type === 'debit' ? card.name : `${card.bank} ${card.name}`}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => skipRecurring(f)}
                      className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5"
                    >
                      Skip
                    </button>
                    <button
                      onClick={() => confirmRecurring(f)}
                      className="text-xs font-medium bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Confirm
                    </button>
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
          <h2 className="font-semibold text-gray-800 mb-3">My Wallet</h2>
          {cardSummaries.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-gray-500">No cards in your wallet yet.</p>
              <Link to="/cards" className="btn-primary mt-3 text-xs">Go to My Cards</Link>
            </div>
          ) : (
            <>
              {/* Filter chips — only shown when there's something to filter */}
              {(hasMultipleTypes || walletBanks.length > 1 || debitMonthlySpent > 0) && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {(['all', ...(hasMultipleTypes ? ['miles', 'cashback'] : []), ...(debitMonthlySpent > 0 ? ['cash'] : []), ...walletBanks] as string[]).map(f => (
                    <button
                      key={f}
                      onClick={() => setWalletFilter(f)}
                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
                        walletFilter === f
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {f === 'all' ? 'All' : f === 'miles' ? 'Miles' : f === 'cashback' ? 'Cashback' : f === 'cash' ? 'Cash/Debit' : f}
                    </button>
                  ))}
                </div>
              )}
            <div className="space-y-5">
              {visibleSummaries.map(({ card, capRows, spendRows, monthlySpent, monthlyMiles }) => (
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
                    <span className="ml-auto text-xs text-gray-500 shrink-0">
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
                            <span className={row.pinned && row.spent === 0 ? 'text-gray-500' : 'text-gray-600'}>
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
                      <span className="text-gray-500">
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
              {/* Debit / cash row */}
              {showDebitRow && debitMonthlySpent > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                      style={{ backgroundColor: '#6B7280' }}
                    >
                      CA
                    </div>
                    <span className="text-sm font-medium text-gray-700">Cash / Debit</span>
                  </div>
                  <div className="pl-7">
                    <div className="flex items-center justify-between text-xs pt-0.5">
                      <span className="text-gray-500">No rewards · total this month</span>
                      <span className="text-gray-600 font-medium">S${debitMonthlySpent.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            </>
          )}
        </div>

        {/* Recent transactions */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Recent Transactions</h2>
            <Link to="/transactions" className="text-xs text-indigo-600 hover:underline">View all</Link>
          </div>
          {recent.length === 0 && upcoming.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">No transactions yet.</p>
              <Link to="/transactions" className="btn-primary mt-3 text-xs">
                <Receipt size={13} /> Log first transaction
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {upcoming.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide flex items-center gap-1.5">
                    <CalendarClock size={12} /> Upcoming ({upcoming.length})
                  </p>
                  {upcoming.map(txnRow)}
                  <div className="pt-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Recent</p>
                  </div>
                </>
              )}
              {recent.length > 0
                ? recent.map(txnRow)
                : <p className="text-sm text-gray-500 py-2">No past transactions yet.</p>}
            </div>
          )}
        </div>
      </div>

      {/* Empty state CTA */}
      {cards.length === 0 && (
        <div className="card p-8 text-center border-dashed border-2 border-gray-300">
          <p className="font-medium text-gray-600">No cards set up yet</p>
          <p className="text-sm text-gray-500 mt-1">Add your credit cards to start tracking miles and getting recommendations.</p>
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
    <div className="card p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
      <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide truncate">{label}</p>
        <p className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight truncate">{value}</p>
        <p className="text-xs text-gray-500">{sub}</p>
      </div>
    </div>
  )
}
