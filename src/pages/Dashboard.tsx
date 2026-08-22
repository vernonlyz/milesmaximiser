import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Sparkles, TrendingUp, Receipt, RefreshCw, AlertCircle, Target, Percent, Plus, CalendarClock, Repeat, ChevronDown, ChevronRight, Wallet, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import CapUsageBar from '../components/CapUsageBar'
import { Skeleton, PageSkeleton } from '../components/Skeleton'
import { SpendingCap, Transaction, TransactionFavourite } from '../lib/types'
import { supabase } from '../lib/supabase'
import { buildPeriodSpending, resolveCaps, applyAllSelectableOverrides, applyCapBoosts, resolveOverride } from '../lib/recommendations'
import { currentMonthLabel, getPeriodLabel, getPeriodStart, getPeriodEnd, formatSGD, isoDate } from '../lib/utils'
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

  // Collapsible Dashboard sections (persisted)
  const [walletCollapsed, setWalletCollapsed] = useState(() => localStorage.getItem('dashWalletCollapsed') === '1')
  const [recentCollapsed, setRecentCollapsed] = useState(() => localStorage.getItem('dashRecentCollapsed') === '1')
  const [upcomingCollapsed, setUpcomingCollapsed] = useState(() => localStorage.getItem('dashUpcomingCollapsed') === '1')
  function toggleWallet() { setWalletCollapsed(c => { localStorage.setItem('dashWalletCollapsed', c ? '0' : '1'); return !c }) }
  function toggleRecent() { setRecentCollapsed(c => { localStorage.setItem('dashRecentCollapsed', c ? '0' : '1'); return !c }) }
  function toggleUpcoming() { setUpcomingCollapsed(c => { localStorage.setItem('dashUpcomingCollapsed', c ? '0' : '1'); return !c }) }

  // Expiring-miles nudge: a compact, session-dismissible chip that appears ONLY when
  // a miles account expires within 90 days (and hasn't expired). Zero footprint otherwise.
  const [expiring, setExpiring] = useState<{ id: string; name: string; expiry_date: string; days: number }[]>([])
  const [expiryDismissed, setExpiryDismissed] = useState(() => sessionStorage.getItem('milesExpiryDismissed') === '1')
  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from('miles_accounts')
        .select('id, name, expiry_date')
        .not('expiry_date', 'is', null)
      if (cancelled || !data) return
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const soon = data
        .map(a => {
          const days = Math.round((new Date(a.expiry_date + 'T00:00:00').getTime() - today.getTime()) / 86400000)
          return { id: a.id as string, name: a.name as string, expiry_date: a.expiry_date as string, days }
        })
        .filter(a => a.days >= 0 && a.days <= 90)
        .sort((a, b) => a.days - b.days)
      setExpiring(soon)
    })()
    return () => { cancelled = true }
  }, [user])
  function dismissExpiry() { sessionStorage.setItem('milesExpiryDismissed', '1'); setExpiryDismissed(true) }

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
  const monthStart = isoDate(new Date(now.getFullYear(), now.getMonth(), 1))
  const monthEnd   = isoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0))
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
    () => applyCapBoosts(cards, applyAllSelectableOverrides(cards, rates, resolvedCaps, overrides, now).caps),
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

      // Use the card's billing cycle bounds for per-card stats and category breakdown,
      // so statement-cycle cards don't bleed in spend from the previous cycle.
      const cardStatDay = card.cap_cycle === 'statement' ? statementDays.get(card.id) : undefined
      const cardStartStr = isoDate(getPeriodStart('monthly', now, cardStatDay))
      const cardEndStr   = isoDate(getPeriodEnd('monthly', now, cardStatDay))
      const cardTxns = transactions.filter(t =>
        t.card_id === card.id && t.transaction_date >= cardStartStr && t.transaction_date <= cardEndStr
      )

      // Per-category spend for this card this period (all categories) — used both for
      // the combined-cap breakdown and the uncapped spend rows below.
      const allCatTotals = new Map<string, number>()
      for (const t of cardTxns) {
        if (!t.category_id) continue
        allCatTotals.set(t.category_id, (allCatTotals.get(t.category_id) ?? 0) + t.amount)
      }

      type BreakdownRow = { catId: string; label: string; spent: number; bonus: boolean }

      const capRows = Array.from(capGroupMap.values()).map(groupCaps => {
        const firstCap = groupCaps[0]
        if (firstCap.cap_group) {
          // Combined cap: one bar for total pooled (bonus) spend vs the shared cap.
          // The per-category breakdown (incl. non-bonus spend) is attached below.
          const groupSpentKey = `${firstCap.card_id}:group:${firstCap.cap_group}`
          const spent = periodSpending.get(groupSpentKey) ?? 0
          const groupCatIds = groupCaps.map(c => c.category_id).filter(Boolean) as string[]
          return {
            key: groupSpentKey,
            label: 'Bonus categories',
            spent,
            limit: firstCap.spend_limit ?? 0,
            period: getPeriodLabel(firstCap.cap_period),
            catIds: groupCatIds,
            combined: true,
            breakdown: undefined as BreakdownRow[] | undefined,
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
          combined: false,
          breakdown: undefined as BreakdownRow[] | undefined,
        }
      }).sort((a, b) => (b.spent / b.limit) - (a.spent / a.limit))

      const monthlySpent = cardTxns.reduce((s, t) => s + t.amount, 0)
      const monthlyMiles = cardTxns.reduce((s, t) => s + (t.miles_earned ?? 0), 0)

      // Categories already represented by a cap bar (bonus-pool + any single caps).
      const coveredCatIds = new Set(capRows.flatMap(r => r.catIds))

      // Non-covered category spend for this card this billing period.
      const catTotals = new Map<string, number>()
      for (const [catId, amt] of allCatTotals) {
        if (coveredCatIds.has(catId)) continue
        catTotals.set(catId, amt)
      }

      const mkRow = (catId: string, spent: number, bonus: boolean): BreakdownRow => {
        const cat = categories.find(c => c.id === catId)
        return { catId, label: cat ? `${cat.icon} ${cat.name}` : '—', spent, bonus }
      }

      // Combined-cap cards: attach a UNIFIED breakdown to the pooled bar — bonus
      // (cap-counting) categories first, then non-bonus, each measured against the
      // card's TOTAL spend. Non-bonus rows live here instead of the separate list.
      const combinedRow = capRows.find(r => r.combined)
      if (combinedRow) {
        const bonusRows = combinedRow.catIds
          .map(catId => mkRow(catId, allCatTotals.get(catId) ?? 0, true))
          .sort((a, b) => b.spent - a.spent)
        const otherRows = Array.from(catTotals.entries())
          .filter(([, amt]) => amt > 0)
          .sort(([, a], [, b]) => b - a)
          .map(([catId, spent]) => mkRow(catId, spent, false))
        combinedRow.breakdown = [...bonusRows, ...otherRows]
      }

      // Separate uncapped spend rows — only for cards without a combined cap (for
      // combined-cap cards these categories are folded into the unified breakdown).
      // For selectable cards, the chosen categories appear first (even at S$0).
      const pinnedCatIds = card.selectable_category
        ? (resolveOverride(overrides, card.id, now) ?? []).filter(id => !coveredCatIds.has(id))
        : []

      const spendRows = combinedRow ? [] : [
        ...pinnedCatIds.map(catId => {
          const cat = categories.find(c => c.id === catId)
          return { key: `pin:${card.id}:${catId}`, catId, label: cat ? `${cat.icon} ${cat.name}` : '—', spent: catTotals.get(catId) ?? 0, pinned: true }
        }),
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
  const upcomingPreview = upcoming.slice(0, 5)
  const upLabel = (t: Transaction) => t.vendor_name || categories.find(c => c.id === t.category_id)?.name || 'Transaction'
  const fmtShortDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })

  function relDays(dateStr: string) {
    const days = Math.round(
      (new Date(dateStr + 'T00:00:00').getTime() - new Date(todayStr + 'T00:00:00').getTime()) / 86400000
    )
    return days <= 1 ? 'tomorrow' : `in ${days} days`
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
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <PageSkeleton rows={2} />
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
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">{currentMonthLabel()}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            onClick={() => navigate('/transactions', { state: { openModal: true } })}
            className="btn-primary text-xs"
          >
            <Plus size={14} /> Log Transaction
          </button>
          <button
            onClick={() => navigate('/transactions', { state: { presetCash: true } })}
            className="btn-secondary text-xs"
            title="Log a cash / debit transaction"
          >
            <Wallet size={13} /> Log Cash
          </button>
          <button onClick={refresh} className="hidden sm:inline-flex btn-secondary text-xs">
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* Expiring-miles nudge — only rendered when something is actually expiring soon */}
      {!expiryDismissed && expiring.length > 0 && (() => {
        const soonest = expiring[0]
        const urgent = soonest.days <= 14
        const fmt = new Date(soonest.expiry_date + 'T00:00:00').toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
        const whenLong = soonest.days === 0 ? 'today' : `in ${soonest.days} day${soonest.days === 1 ? '' : 's'}`
        const whenShort = soonest.days === 0 ? 'today' : `in ${soonest.days}d`
        return (
          <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${urgent ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
            <CalendarClock size={15} className="shrink-0" />
            <span className="min-w-0 flex-1 truncate">
              {expiring.length === 1
                ? <><strong>{soonest.name}</strong> miles expire {whenLong} · {fmt}</>
                : <>{expiring.length} accounts have miles expiring soon — soonest <strong>{soonest.name}</strong> {whenShort}</>}
            </span>
            <Link to="/miles" className="shrink-0 font-medium underline underline-offset-2 hover:no-underline">View</Link>
            <button onClick={dismissExpiry} aria-label="Dismiss expiring-miles alert" className="shrink-0 opacity-60 hover:opacity-100">
              <X size={15} />
            </button>
          </div>
        )
      })()}

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Wallet cards with cap usage */}
        <div className="card p-5">
          <button onClick={toggleWallet} className="flex items-center w-full text-left mb-3">
            <h2 className="font-semibold text-gray-800">My Wallet</h2>
            <span className="ml-auto text-gray-300">{walletCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}</span>
          </button>
          {!walletCollapsed && (cardSummaries.length === 0 ? (
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
                  {/* Card name row — click to view this card's transactions (this month) */}
                  <button
                    onClick={() => navigate('/transactions', { state: { filterCardId: card.id } })}
                    className="group flex items-center gap-2 mb-2 w-full text-left"
                    title="View this card's transactions"
                  >
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                      style={{ backgroundColor: card.color }}
                    >
                      {card.bank.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-indigo-600 transition-colors">
                      {card.bank} {card.name}
                    </span>
                    <ChevronRight size={13} className="text-gray-300 group-hover:text-indigo-400 shrink-0" />
                    <span className="ml-auto text-xs text-gray-500 shrink-0">
                      {card.cap_cycle === 'statement' && statementDays.has(card.id)
                        ? `Stmt day ${statementDays.get(card.id)}`
                        : 'Calendar Mth'}
                    </span>
                  </button>
                  <div className="pl-7 space-y-3">
                    {/* Cap bars for capped categories. Combined-cap cards (HSBC
                        Revolution, Maybank XL Rewards) show a segmented TOTAL-vs-cap
                        bar — bonus spend (solid) counts toward the cap, non-bonus
                        (lighter) is shown alongside — then a unified per-category
                        breakdown beneath it (bonus first, then non-bonus). */}
                    {capRows.map(row => {
                      if (!row.combined) {
                        return (
                          <div key={row.key}>
                            <CapUsageBar label={row.label} spent={row.spent} limit={row.limit} period={row.period} />
                          </div>
                        )
                      }
                      // Segmented total-vs-cap bar: bonus (solid) + non-bonus (light),
                      // filling toward the shared cap. Still surfaces bonus headroom so
                      // it doesn't read "maxed" while bonus room remains.
                      const cap = row.limit
                      const bonusSpent = row.spent
                      const nonBonus = Math.max(0, monthlySpent - bonusSpent)
                      const bonusW = cap > 0 ? Math.min(bonusSpent / cap, 1) * 100 : 0
                      const nonBonusW = cap > 0 ? Math.min(nonBonus / cap, Math.max(0, 1 - bonusSpent / cap)) * 100 : 0
                      const bonusLeft = Math.max(0, cap - bonusSpent)
                      const overCap = monthlySpent > cap
                      return (
                      <div key={row.key}>
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-gray-600 font-medium">Total spend</span>
                            <span className={`tabular-nums ${overCap ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                              S${monthlySpent.toFixed(0)} / S${cap.toFixed(0)}
                            </span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
                            <div className={`h-full ${overCap ? 'bg-red-500' : 'bg-indigo-500'}`} style={{ width: `${bonusW}%` }} title="Bonus spend (counts toward cap)" />
                            <div className={`h-full ${overCap ? 'bg-red-300' : 'bg-indigo-200'}`} style={{ width: `${nonBonusW}%` }} title="Non-bonus spend" />
                          </div>
                          <div className="flex items-center justify-between text-[11px] mt-1">
                            <span className="text-gray-400">
                              <span className="text-indigo-500 font-medium">S${bonusSpent.toFixed(0)} bonus</span> · S${nonBonus.toFixed(0)} other
                            </span>
                            <span className={bonusLeft > 0 ? 'text-gray-400' : 'text-amber-600 font-medium'}>
                              {bonusLeft > 0 ? `S$${bonusLeft.toFixed(0)} bonus cap left` : 'bonus cap maxed'}
                              {overCap && bonusLeft > 0 && ' · total over cap'}
                            </span>
                          </div>
                        </div>
                        {row.breakdown && row.breakdown.length > 0 && (
                          <div className="mt-1.5 ml-1 pl-3 border-l-2 border-gray-100 space-y-1">
                            {row.breakdown.map((b, i) => {
                              const pct = monthlySpent > 0 ? (b.spent / monthlySpent) * 100 : 0
                              const showDivider = !b.bonus && (i === 0 || row.breakdown![i - 1].bonus)
                              return (
                                <div key={b.catId}>
                                  {showDivider && (
                                    <div className="text-[10px] uppercase tracking-wide text-gray-300 pt-0.5 pb-0.5">Outside bonus cap</div>
                                  )}
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-500">{b.label}</span>
                                    <span className="text-gray-500 tabular-nums">
                                      {b.spent > 0 ? `S$${b.spent.toFixed(2)}` : '—'}
                                      {b.spent > 0 && monthlySpent > 0 && (
                                        <span className="text-gray-300 ml-1">{Math.round(pct)}%</span>
                                      )}
                                    </span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                      )
                    })}

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
          ))}
        </div>

        {/* Recent transactions */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <button onClick={toggleRecent} className="flex items-center gap-2 text-left">
              <h2 className="font-semibold text-gray-800">Recent Transactions</h2>
              <span className="text-gray-300">{recentCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}</span>
            </button>
            <Link to="/transactions" className="text-xs text-indigo-600 hover:underline">View all</Link>
          </div>
          {!recentCollapsed && (recent.length === 0 && upcoming.length === 0 ? (
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
                  <button onClick={toggleUpcoming} className="w-full flex items-center gap-1.5 text-left">
                    <CalendarClock size={12} className="text-indigo-600" />
                    <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Upcoming ({upcoming.length})</span>
                    <span className="ml-auto text-gray-300">{upcomingCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}</span>
                  </button>
                  {upcomingCollapsed ? (
                    upcoming[0] && (
                      <p className="text-xs text-gray-500 pl-4">next: {upLabel(upcoming[0])} · {fmtShortDate(upcoming[0].transaction_date)}</p>
                    )
                  ) : (
                    <>
                      {upcomingPreview.map(txnRow)}
                      {upcoming.length > upcomingPreview.length && (
                        <Link to="/transactions" state={{ showUpcoming: 'all' }} className="text-xs text-indigo-600 hover:underline pl-1 inline-block">
                          View all {upcoming.length} upcoming →
                        </Link>
                      )}
                    </>
                  )}
                  {recent.length > 0 && (
                    <div className="pt-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Recent</p>
                    </div>
                  )}
                </>
              )}
              {recent.length > 0
                ? recent.map(txnRow)
                : <p className="text-sm text-gray-500 py-2">No past transactions yet.</p>}
            </div>
          ))}
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
