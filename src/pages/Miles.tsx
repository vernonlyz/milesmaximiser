import { useEffect, useMemo, useState } from 'react'
import {
  Award, AlertTriangle, AlertCircle, CalendarClock, Save, Plus, X, Layers, RotateCcw, Trash2, ChevronDown, ChevronRight, Pencil, HelpCircle, Infinity as InfinityIcon, ArrowUp, Plane, History, Camera,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { supabase } from '../lib/supabase'
import { MilesAccount, MilesAccountCard, MilesAdjustment, MilesBalanceHistory } from '../lib/types'
import Modal from '../components/Modal'
import MilesTabs from '../components/MilesTabs'
import DatePicker from '../components/DatePicker'
import { PageSkeleton } from '../components/Skeleton'
import ErrorState from '../components/ErrorState'

interface EarnRow { card_id: string | null; miles_earned: number | null; transaction_date: string }

function today() {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function monthsUntil(dateStr: string): number {
  const expiry = new Date(dateStr)
  const now = new Date()
  return (expiry.getFullYear() - now.getFullYear()) * 12 + (expiry.getMonth() - now.getMonth())
}

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
}

function ExpiryBadge({ dateStr }: { dateStr: string }) {
  const months = monthsUntil(dateStr)
  if (months < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
        <AlertCircle size={11} /> Expired
      </span>
    )
  }
  if (months < 6) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
        <AlertTriangle size={11} /> Expires {fmtDate(dateStr)}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
      <CalendarClock size={11} /> Expires {fmtDate(dateStr)}
    </span>
  )
}

export default function Miles() {
  const { cards } = useApp()
  const { user } = useAuth()
  const toast = useToast()

  const [accounts, setAccounts] = useState<MilesAccount[]>([])
  const [links, setLinks] = useState<MilesAccountCard[]>([])
  const [adjustments, setAdjustments] = useState<MilesAdjustment[]>([])
  const [history, setHistory] = useState<MilesBalanceHistory[]>([])
  const [historyOpen, setHistoryOpen] = useState<Set<string>>(new Set())
  const [earn, setEarn] = useState<EarnRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  // Per-account UI state
  const [drafts, setDrafts] = useState<Record<string, { name: string; opening: string; asOf: string; expiry: string }>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [ledgerOpen, setLedgerOpen] = useState<Set<string>>(new Set())
  const [adjFormFor, setAdjFormFor] = useState<string | null>(null)
  const [adjDraft, setAdjDraft] = useState({ date: today(), miles: '', type: 'redeem' as 'redeem' | 'bonus', note: '' })
  const [addCardFor, setAddCardFor] = useState<string | null>(null)
  // Dialog state (in-app modals replacing native prompt/confirm)
  const [addOpen, setAddOpen] = useState(false)
  const [addName, setAddName] = useState('')
  const [reconcileFor, setReconcileFor] = useState<MilesAccount | null>(null)
  const [accToDelete, setAccToDelete] = useState<MilesAccount | null>(null)
  // Single cumulative miles goal across all accounts
  const [milesGoal, setMilesGoal] = useState<number | null>(null)
  const [goalInput, setGoalInput] = useState('')
  const [milesGoalLabel, setMilesGoalLabel] = useState('')
  const [goalLabelInput, setGoalLabelInput] = useState('')
  // Collapsed by default; only expanded if the user previously opened it.
  const [helpOpen, setHelpOpen] = useState(() => localStorage.getItem('milesHelpCollapsed') === '0')

  function toggleHelp() {
    setHelpOpen(o => { localStorage.setItem('milesHelpCollapsed', o ? '1' : '0'); return !o })
  }

  const milesCards = useMemo(() => cards.filter(c => c.card_type === 'miles'), [cards])
  const cardById = useMemo(() => new Map(cards.map(c => [c.id, c])), [cards])

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [milesCards.length])

  async function reload() {
   try {
    const [accRes, linkRes, adjRes, earnRes, settingsRes, histRes] = await Promise.all([
      supabase.from('miles_accounts').select('*').order('name'),
      supabase.from('miles_account_cards').select('*'),
      supabase.from('miles_adjustments').select('*').order('adjustment_date', { ascending: false }),
      supabase.from('transactions').select('card_id, miles_earned, transaction_date'),
      supabase.from('user_settings').select('miles_goal, miles_goal_label').maybeSingle(),
      supabase.from('miles_balance_history').select('*').order('as_of_date', { ascending: false }).order('created_at', { ascending: false }),
    ])
    if (accRes.error || linkRes.error || adjRes.error || earnRes.error) throw new Error('load failed')
    setLoadError(false)
    setHistory((histRes.data as MilesBalanceHistory[]) ?? [])
    const settings = settingsRes.data as { miles_goal: number | null; miles_goal_label: string | null } | null
    const goal = settings?.miles_goal ?? null
    const goalLabel = settings?.miles_goal_label ?? ''
    setMilesGoal(goal)
    setGoalInput(goal != null ? String(goal) : '')
    setMilesGoalLabel(goalLabel)
    setGoalLabelInput(goalLabel)
    let acc = (accRes.data as MilesAccount[]) ?? []
    let lnk = (linkRes.data as MilesAccountCard[]) ?? []

    let mutated = false

    // Auto-create a pool-of-one account for any wallet miles card not yet linked.
    const linked = new Set(lnk.map(l => l.card_id))
    const orphans = milesCards.filter(c => !linked.has(c.id))
    for (const card of orphans) {
      const { data: created } = await supabase
        .from('miles_accounts')
        .insert({ user_id: user!.id, name: `${card.bank} ${card.name}`, opening_miles: 0, as_of_date: today() })
        .select()
        .single()
      if (created) {
        await supabase.from('miles_account_cards').insert({
          account_id: (created as MilesAccount).id, card_id: card.id, user_id: user!.id,
        })
        mutated = true
      }
    }

    // Seed a default standalone "KrisFlyer miles" balance once per user. Keyed in
    // localStorage so it isn't recreated if the user later deletes it. Match the
    // exact name so a "UOB KrisFlyer Visa" card account doesn't suppress seeding.
    const seedKey = `milesKrisflyerSeeded2:${user!.id}`
    if (!localStorage.getItem(seedKey)) {
      const hasKrisflyer = acc.some(a => a.name.trim().toLowerCase() === 'krisflyer miles')
      if (!hasKrisflyer) {
        await supabase.from('miles_accounts').insert({
          user_id: user!.id, name: 'KrisFlyer miles', opening_miles: 0, as_of_date: today(),
        })
        mutated = true
      }
      localStorage.setItem(seedKey, '1')
    }

    if (mutated) {
      const [a2, l2] = await Promise.all([
        supabase.from('miles_accounts').select('*').order('name'),
        supabase.from('miles_account_cards').select('*'),
      ])
      acc = (a2.data as MilesAccount[]) ?? []
      lnk = (l2.data as MilesAccountCard[]) ?? []
    }

    // Normalize default names to "Bank CardName" for pool-of-one accounts the
    // user hasn't renamed (covers older auto-created and migrated 'Card balance' rows).
    const cba = new Map<string, string[]>()
    for (const l of lnk) {
      const arr = cba.get(l.account_id) ?? []
      arr.push(l.card_id)
      cba.set(l.account_id, arr)
    }
    const nameUpdates: PromiseLike<unknown>[] = []
    acc = acc.map(account => {
      const cardIds = cba.get(account.id) ?? []
      if (cardIds.length !== 1) return account
      const card = cardById.get(cardIds[0])
      if (!card) return account
      const desired = `${card.bank} ${card.name}`
      const isDefault = account.name === card.name || account.name === 'Card balance'
      if (isDefault && account.name !== desired) {
        nameUpdates.push(supabase.from('miles_accounts').update({ name: desired }).eq('id', account.id))
        return { ...account, name: desired }
      }
      return account
    })
    if (nameUpdates.length > 0) await Promise.all(nameUpdates)

    setAccounts(acc)
    setLinks(lnk)
    setAdjustments((adjRes.data as MilesAdjustment[]) ?? [])
    setEarn((earnRes.data as EarnRow[]) ?? [])
   } catch {
    setLoadError(true)
   } finally {
    setLoading(false)
   }
  }

  // ---- derived lookups ----
  const cardsByAccount = useMemo(() => {
    const m = new Map<string, string[]>()
    for (const l of links) {
      const arr = m.get(l.account_id) ?? []
      arr.push(l.card_id)
      m.set(l.account_id, arr)
    }
    return m
  }, [links])

  const adjByAccount = useMemo(() => {
    const m = new Map<string, MilesAdjustment[]>()
    for (const a of adjustments) {
      const arr = m.get(a.account_id) ?? []
      arr.push(a)
      m.set(a.account_id, arr)
    }
    return m
  }, [adjustments])

  function earnedFor(account: MilesAccount): number {
    const cardIds = new Set(cardsByAccount.get(account.id) ?? [])
    let sum = 0
    for (const t of earn) {
      if (t.card_id && cardIds.has(t.card_id) && t.miles_earned && t.transaction_date > account.as_of_date) {
        sum += t.miles_earned
      }
    }
    return Math.round(sum)
  }

  // Only adjustments after the snapshot count toward the total — earlier ones are
  // already baked into opening_miles (this keeps reconcile from double-counting).
  function adjSum(account: MilesAccount): number {
    return (adjByAccount.get(account.id) ?? [])
      .filter(a => a.adjustment_date > account.as_of_date)
      .reduce((s, a) => s + a.miles, 0)
  }

  function totalFor(account: MilesAccount): number {
    return account.opening_miles + earnedFor(account) + adjSum(account)
  }

  // Balance-history snapshots, newest first, per account.
  const historyByAccount = useMemo(() => {
    const m = new Map<string, MilesBalanceHistory[]>()
    for (const h of history) { const arr = m.get(h.account_id) ?? []; arr.push(h); m.set(h.account_id, arr) }
    return m
  }, [history])

  async function saveSnapshot(account: MilesAccount) {
    await supabase.from('miles_balance_history').insert({
      user_id: user!.id, account_id: account.id, balance: totalFor(account), as_of_date: today(), source: 'manual',
    })
    toast('Snapshot saved')
    reload()
  }

  async function deleteSnapshot(id: string) {
    await supabase.from('miles_balance_history').delete().eq('id', id)
    reload()
  }

  function draftFor(a: MilesAccount) {
    return drafts[a.id] ?? {
      name: a.name,
      opening: String(a.opening_miles),
      asOf: a.as_of_date,
      expiry: a.expiry_date ?? '',
    }
  }

  function setDraft(id: string, patch: Partial<{ name: string; opening: string; asOf: string; expiry: string }>) {
    setDrafts(prev => {
      const base = prev[id] ?? draftFor(accounts.find(a => a.id === id)!)
      return { ...prev, [id]: { ...base, ...patch } }
    })
  }

  function isDirty(a: MilesAccount) {
    const d = drafts[a.id]
    if (!d) return false
    return (
      d.name !== a.name ||
      (parseInt(d.opening || '0') || 0) !== a.opening_miles ||
      d.asOf !== a.as_of_date ||
      (d.expiry || null) !== (a.expiry_date ?? null)
    )
  }

  async function saveAccount(a: MilesAccount) {
    const d = draftFor(a)
    setSavingId(a.id)
    await supabase.from('miles_accounts').update({
      name: d.name.trim() || a.name,
      opening_miles: parseInt(d.opening || '0') || 0,
      as_of_date: d.asOf,
      expiry_date: d.expiry || null,
      updated_at: new Date().toISOString(),
    }).eq('id', a.id)
    setDrafts(prev => { const n = { ...prev }; delete n[a.id]; return n })
    setSavingId(null)
    toast('Balance updated')
    reload()
  }

  // ---- reconcile: set opening = current total, as-of = today, clears running drift ----
  async function confirmReconcile() {
    const a = reconcileFor
    if (!a) return
    const total = a.opening_miles + earnedFor(a) + adjSum(a)
    await supabase.from('miles_accounts').update({
      opening_miles: total,
      as_of_date: today(),
      updated_at: new Date().toISOString(),
    }).eq('id', a.id)
    // Keep a snapshot of the balance at each reconcile.
    await supabase.from('miles_balance_history').insert({
      user_id: user!.id, account_id: a.id, balance: total, as_of_date: today(), source: 'reconcile',
    })
    setReconcileFor(null)
    toast('Balance reconciled')
    reload()
  }

  // ---- adjustments ----
  async function addAdjustment(accountId: string) {
    const magnitude = Math.abs(parseInt(adjDraft.miles || '0') || 0)
    if (magnitude === 0) return
    const signed = adjDraft.type === 'redeem' ? -magnitude : magnitude
    await supabase.from('miles_adjustments').insert({
      account_id: accountId,
      user_id: user!.id,
      adjustment_date: adjDraft.date,
      miles: signed,
      note: adjDraft.note.trim() || null,
    })
    setAdjFormFor(null)
    setAdjDraft({ date: today(), miles: '', type: 'redeem', note: '' })
    toast(signed < 0 ? 'Redemption recorded' : 'Bonus recorded')
    reload()
  }

  async function deleteAdjustment(id: string) {
    await supabase.from('miles_adjustments').delete().eq('id', id)
    reload()
  }

  // ---- pooling ----
  // Move a card into an existing account; delete the source account if it becomes empty.
  async function moveCardToAccount(cardId: string, targetAccountId: string) {
    const sourceId = links.find(l => l.card_id === cardId)?.account_id
    await supabase.from('miles_account_cards').delete().eq('card_id', cardId)
    await supabase.from('miles_account_cards').insert({
      account_id: targetAccountId, card_id: cardId, user_id: user!.id,
    })
    if (sourceId && sourceId !== targetAccountId) {
      const remaining = (cardsByAccount.get(sourceId) ?? []).filter(c => c !== cardId)
      if (remaining.length === 0) await supabase.from('miles_accounts').delete().eq('id', sourceId)
    }
    setAddCardFor(null)
    reload()
  }

  // Split a card out of a multi-card pool into its own new account.
  async function ungroupCard(cardId: string) {
    const card = cardById.get(cardId)
    const name = card ? `${card.bank} ${card.name}` : 'Card balance'
    const { data: created } = await supabase
      .from('miles_accounts')
      .insert({ user_id: user!.id, name, opening_miles: 0, as_of_date: today() })
      .select()
      .single()
    if (created) {
      await supabase.from('miles_account_cards').delete().eq('card_id', cardId)
      await supabase.from('miles_account_cards').insert({
        account_id: (created as MilesAccount).id, card_id: cardId, user_id: user!.id,
      })
    }
    reload()
  }

  // Create a standalone miles balance not tied to a card (e.g. KrisFlyer miles
  // held directly from transfers). Total = opening + adjustments (no card earn).
  function openAddBalance() {
    setAddName('')
    setAddOpen(true)
  }

  async function saveGoal() {
    const val = goalInput ? parseInt(goalInput) || null : null
    const label = goalLabelInput.trim() || null
    await supabase.from('user_settings').upsert(
      { user_id: user!.id, miles_goal: val, miles_goal_label: label, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
    setMilesGoal(val)
    setMilesGoalLabel(label ?? '')
    toast('Goal saved')
  }

  async function submitAddBalance() {
    await supabase.from('miles_accounts').insert({
      user_id: user!.id,
      name: addName.trim() || 'Miles balance',
      opening_miles: 0,
      as_of_date: today(),
    })
    setAddOpen(false)
    toast('Balance added')
    reload()
  }

  // Delete a standalone balance (no linked cards). Card-linked accounts are not
  // deletable here — they'd just be auto-recreated from the wallet on reload.
  async function confirmDeleteAccount() {
    if (!accToDelete) return
    await supabase.from('miles_accounts').delete().eq('id', accToDelete.id)
    setAccToDelete(null)
    toast('Balance removed')
    reload()
  }

  // Total miles across every account, using live (possibly unsaved) opening edits.
  const grandTotal = accounts.reduce((s, a) => {
    const d = drafts[a.id]
    const opening = d ? (parseInt(d.opening || '0') || 0) : a.opening_miles
    return s + opening + earnedFor(a) + adjSum(a)
  }, 0)

  if (loading) return <div className="space-y-5"><MilesTabs /><PageSkeleton /></div>
  if (loadError) return <div className="space-y-5"><MilesTabs /><ErrorState onRetry={() => { setLoadError(false); setLoading(true); reload() }} /></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Award size={22} className="text-indigo-500" />
          Miles
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Track how many miles you hold on each card, and when they expire.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <MilesTabs />
        <button
          onClick={openAddBalance}
          className="flex items-center gap-1.5 text-sm font-medium bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors shrink-0 ml-auto"
        >
          <Plus size={14} /> Add balance
        </button>
      </div>

      {/* Total across all accounts + cumulative goal */}
      {accounts.length > 0 && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total miles</p>
              <p className="text-3xl font-bold text-indigo-600 mt-0.5">{Math.round(grandTotal).toLocaleString()}</p>
              <p className="text-xs text-gray-500">across {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
              <Award size={22} className="text-indigo-500" />
            </div>
          </div>

          {/* Goal — single target across all miles */}
          <div className="border-t border-gray-100 pt-3">
            <div className="flex items-center gap-2 flex-wrap">
              <label className="text-xs text-gray-500 shrink-0">Goal</label>
              <input
                type="number" min="0" step="1000"
                value={goalInput}
                onChange={e => setGoalInput(e.target.value)}
                placeholder="e.g. 100,000"
                className="input text-xs py-1 w-28"
              />
              <input
                type="text"
                value={goalLabelInput}
                onChange={e => setGoalLabelInput(e.target.value)}
                placeholder="What for? e.g. SQ Suites to JFK"
                className="input text-xs py-1 flex-1 min-w-[140px]"
              />
              {((goalInput ? parseInt(goalInput) || 0 : null) !== (milesGoal ?? null) ||
                goalLabelInput.trim() !== milesGoalLabel) && (
                <button
                  onClick={saveGoal}
                  className="text-xs font-medium bg-indigo-600 text-white px-2.5 py-1 rounded-lg hover:bg-indigo-700 transition-colors shrink-0"
                >
                  Save
                </button>
              )}
            </div>
            {milesGoal != null && milesGoal > 0 && (() => {
              const pct = Math.min((grandTotal / milesGoal) * 100, 100)
              const remaining = Math.max(milesGoal - grandTotal, 0)
              const reached = grandTotal >= milesGoal
              return (
                <div className="mt-2.5">
                  {milesGoalLabel && (
                    <p className="text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                      <Plane size={12} className="text-indigo-500" style={{ transform: 'rotate(45deg)' }} />
                      {milesGoalLabel}
                    </p>
                  )}
                  {/* Progress bar with an airplane flying along it */}
                  <div className="relative h-5">
                    <div className="absolute top-1/2 -translate-y-1/2 inset-x-0 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${reached ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <Plane
                      size={17}
                      className={reached ? 'text-emerald-600' : 'text-indigo-600'}
                      style={{ position: 'absolute', top: '50%', left: `${pct}%`, transform: 'translate(-50%, -50%) rotate(45deg)' }}
                    />
                  </div>
                  <div className="flex justify-between mt-1 text-xs">
                    <span className="text-gray-500">{Math.round(grandTotal).toLocaleString()} / {milesGoal.toLocaleString()} ({Math.floor(pct)}%)</span>
                    {reached
                      ? <span className="text-emerald-600 font-medium">🎉 Goal reached</span>
                      : <span className="text-gray-500">{Math.round(remaining).toLocaleString()} miles to go</span>}
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl overflow-hidden">
        <button
          onClick={toggleHelp}
          className="flex items-center gap-2 w-full px-4 py-3 text-left"
        >
          <HelpCircle size={16} className="text-indigo-500 shrink-0" />
          <span className="text-sm font-semibold text-indigo-900 flex-1">How this page works</span>
          {helpOpen ? <ChevronDown size={16} className="text-indigo-400" /> : <ChevronRight size={16} className="text-indigo-400" />}
        </button>
        {helpOpen && (
          <div className="px-4 pb-4 space-y-2.5 text-sm text-indigo-900/80">
            <p>
              <span className="font-semibold">Your total</span> = <span className="font-medium">Opening</span> balance
              {' '}+ <span className="font-medium">Earned</span> (miles from logged transactions after the snapshot date)
              {' '}+ <span className="font-medium">Adjustments</span> (redemptions and bonuses you record).
            </p>
            <p>
              <span className="font-semibold">1. Set your opening balance.</span> Enter the miles your bank
              app currently shows, and set the <span className="font-medium">"as of"</span> date to today. Only
              transactions after that date are added on top, so nothing gets double-counted.
            </p>
            <p>
              <span className="font-semibold">2. Record redemptions &amp; bonuses.</span> Use
              {' '}<span className="font-medium">Add</span> to log when you spend miles (redemption) or receive
              extra miles (bonus / transfer). Each entry is kept in the history.
            </p>
            <p>
              <span className="font-semibold">3. Pool shared cards.</span> Some banks (e.g. UOB) pool all
              cards into one miles balance. Use <span className="font-medium">Add card to pool</span> to combine
              them, and rename the pool by editing its title. Click ✕ on a card to split it back out.
            </p>
            <p>
              <span className="font-semibold">4. Reconcile</span> when your numbers drift from the bank's.
              It takes your current displayed total, makes that your new opening balance as of today, and
              starts counting fresh — your redemption history stays intact.
            </p>
            <p>
              <span className="font-semibold">5. Expiry.</span> Set an expiry date to get a
              {' '}<span className="text-amber-700 font-medium">warning when miles are within 6 months</span> of
              expiring, or mark <span className="font-medium">No expiry</span> if they never lapse.
            </p>
          </div>
        )}
      </div>

      {accounts.length === 0 ? (
        <div className="card p-10 text-center border-dashed border-2 border-gray-200 space-y-3">
          <p className="text-gray-500 text-sm">No miles balances yet. Add a balance to track miles directly, or add miles cards in My Cards.</p>
          <button
            onClick={openAddBalance}
            className="inline-flex items-center gap-1.5 text-sm font-medium bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus size={14} /> Add balance
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {accounts.map(account => {
            const d = draftFor(account)
            const linkedCards = (cardsByAccount.get(account.id) ?? []).map(id => cardById.get(id)).filter(Boolean)
            const earned = earnedFor(account)
            const opening = parseInt(d.opening || '0') || 0
            const net = adjSum(account)
            const total = opening + earned + net
            const ledger = adjByAccount.get(account.id) ?? []
            const dirty = isDirty(account)
            const isPool = linkedCards.length > 1
            const otherCards = milesCards.filter(c => !(cardsByAccount.get(account.id) ?? []).includes(c.id))

            return (
              <div key={account.id} className="card p-5 space-y-4">
                {/* Header */}
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center bg-indigo-100 text-indigo-600">
                    {isPool ? <Layers size={16} /> : <Award size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="group flex items-center gap-1.5">
                      <input
                        value={d.name}
                        onChange={e => setDraft(account.id, { name: e.target.value })}
                        title="Click to rename"
                        className="font-semibold text-gray-900 text-sm bg-transparent border border-dashed border-gray-200 rounded px-1.5 py-0.5 hover:border-indigo-300 focus:border-indigo-400 focus:border-solid focus:outline-none min-w-0 flex-1"
                      />
                      <Pencil size={12} className="text-gray-300 group-hover:text-indigo-400 shrink-0" />
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      {linkedCards.map(c => (
                        <span key={c!.id} className="inline-flex items-center gap-1.5 text-xs bg-gray-100 text-gray-600 rounded-full pl-1.5 pr-1 py-0.5">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ background: c!.color ?? '#6366f1' }}
                          />
                          <span className="font-medium text-gray-700">{c!.bank}</span>
                          <span className="text-gray-500">{c!.name}</span>
                          {isPool && (
                            <button
                              onClick={() => ungroupCard(c!.id)}
                              title="Remove from pool"
                              className="text-gray-500 hover:text-red-500"
                            >
                              <X size={11} />
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-start gap-2 shrink-0">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-indigo-600">{total.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">total miles</p>
                    </div>
                    {linkedCards.length === 0 && (
                      <button
                        onClick={() => setAccToDelete(account)}
                        title="Remove balance"
                        className="text-gray-300 hover:text-red-500 transition-colors mt-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Breakdown — on phones Opening spans the full width, Earned + Adjustments share a row */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div className="bg-gray-50 rounded-lg p-2.5 col-span-2 sm:col-span-1">
                    <p className="text-xs text-gray-500 mb-1">Opening</p>
                    <input
                      type="number" step="100" min="0"
                      value={d.opening}
                      onChange={e => setDraft(account.id, { opening: e.target.value })}
                      className="input text-sm py-1 w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      as of
                      <DatePicker
                        bare
                        value={d.asOf}
                        onChange={v => setDraft(account.id, { asOf: v })}
                        className="text-xs text-gray-600 hover:text-indigo-600"
                      />
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5">
                    <p className="text-xs text-gray-500 mb-1">Earned (since)</p>
                    <p className="text-sm font-semibold text-emerald-600 pt-1.5">+{earned.toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5">
                    <p className="text-xs text-gray-500 mb-1">Adjustments</p>
                    <p className={`text-sm font-semibold pt-1.5 ${net < 0 ? 'text-red-500' : net > 0 ? 'text-emerald-600' : 'text-gray-500'}`}>
                      {net > 0 ? '+' : ''}{net.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* First-run nudge for an untouched, empty balance */}
                {opening === 0 && total === 0 && !dirty && (
                  <p className="text-xs text-indigo-500 flex items-center gap-1 -mt-1">
                    <ArrowUp size={11} className="shrink-0" /> Set your opening balance above to start tracking.
                  </p>
                )}

                {/* Expiry */}
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="text-xs text-gray-500 shrink-0">Expiry</label>
                  <DatePicker
                    value={d.expiry}
                    onChange={v => setDraft(account.id, { expiry: v })}
                    clearable
                    placeholder="No expiry"
                    className="text-xs py-1 w-40"
                  />
                  {d.expiry ? (
                    <ExpiryBadge dateStr={d.expiry} />
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                      <InfinityIcon size={13} /> No expiry — you won't be warned
                    </span>
                  )}
                </div>

                {/* Ledger */}
                <div className="border-t border-gray-100 pt-3">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setLedgerOpen(prev => {
                        const n = new Set(prev); n.has(account.id) ? n.delete(account.id) : n.add(account.id); return n
                      })}
                      className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900"
                    >
                      {ledgerOpen.has(account.id) ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                      Redemptions &amp; bonuses ({ledger.length})
                    </button>
                    <button
                      onClick={() => { setAdjFormFor(adjFormFor === account.id ? null : account.id); setAddCardFor(null) }}
                      className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      <Plus size={13} /> Add
                    </button>
                  </div>

                  {adjFormFor === account.id && (
                    <div className="mt-3 bg-indigo-50/60 border border-indigo-100 rounded-lg p-3 space-y-2">
                      <div className="flex gap-2">
                        {(['redeem', 'bonus'] as const).map(t => (
                          <button
                            key={t}
                            onClick={() => setAdjDraft(p => ({ ...p, type: t }))}
                            className={`flex-1 py-1 rounded-md text-xs font-medium border transition-colors ${
                              adjDraft.type === t ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200'
                            }`}
                          >
                            {t === 'redeem' ? '− Redemption' : '+ Bonus / transfer'}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <DatePicker
                          value={adjDraft.date}
                          onChange={v => setAdjDraft(p => ({ ...p, date: v }))}
                          className="text-xs py-1 w-36"
                        />
                        <input
                          type="number" min="0" step="100" placeholder="miles"
                          value={adjDraft.miles}
                          onChange={e => setAdjDraft(p => ({ ...p, miles: e.target.value }))}
                          className="input text-xs py-1 flex-1"
                        />
                      </div>
                      <input
                        placeholder="Note (e.g. SQ to Tokyo)"
                        value={adjDraft.note}
                        onChange={e => setAdjDraft(p => ({ ...p, note: e.target.value }))}
                        className="input text-xs py-1 w-full"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => addAdjustment(account.id)} className="btn-primary text-xs py-1 flex-1">Add entry</button>
                        <button onClick={() => setAdjFormFor(null)} className="text-xs text-gray-500 px-3">Cancel</button>
                      </div>
                    </div>
                  )}

                  {ledgerOpen.has(account.id) && ledger.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {ledger.map(adj => {
                        const bakedIn = adj.adjustment_date <= account.as_of_date
                        return (
                          <div key={adj.id} className={`flex items-center gap-2 text-xs py-1 border-b border-gray-50 last:border-0 ${bakedIn ? 'opacity-40' : ''}`}>
                            <span className="text-gray-500 w-20 shrink-0">{fmtDate(adj.adjustment_date)}</span>
                            <span className={`font-medium w-20 shrink-0 ${adj.miles < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                              {adj.miles > 0 ? '+' : ''}{adj.miles.toLocaleString()}
                            </span>
                            <span className="text-gray-600 flex-1 truncate">
                              {adj.note ?? '—'}{bakedIn && <span className="text-gray-500"> · in opening</span>}
                            </span>
                            <button onClick={() => deleteAdjustment(adj.id)} className="text-gray-300 hover:text-red-500 shrink-0">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap border-t border-gray-100 pt-3">
                  {otherCards.length > 0 && (
                    <div className="relative">
                      <button
                        onClick={() => { setAddCardFor(addCardFor === account.id ? null : account.id); setAdjFormFor(null) }}
                        className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg px-2.5 py-1.5"
                      >
                        <Layers size={12} /> Add card to pool
                      </button>
                      {addCardFor === account.id && (
                        <div className="absolute z-10 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-max min-w-[180px] max-w-[280px]">
                          {otherCards.map(c => (
                            <button
                              key={c.id}
                              onClick={() => moveCardToAccount(c.id, account.id)}
                              className="flex items-center gap-2 w-full text-left text-xs px-3 py-1.5 hover:bg-gray-50 text-gray-700 whitespace-nowrap"
                            >
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ background: c.color ?? '#6366f1' }}
                              />
                              <span className="font-medium text-gray-700 shrink-0">{c.bank}</span>
                              <span className="text-gray-500 truncate">{c.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <button
                    onClick={() => setReconcileFor(account)}
                    title="Re-baseline: set opening to your current total as of today. Use when your numbers drift from the bank's."
                    className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg px-2.5 py-1.5"
                  >
                    <RotateCcw size={12} /> Reconcile
                  </button>
                  <button
                    onClick={() => saveSnapshot(account)}
                    title="Save a snapshot of this balance to the history"
                    className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg px-2.5 py-1.5"
                  >
                    <Camera size={12} /> Snapshot
                  </button>
                  {(historyByAccount.get(account.id)?.length ?? 0) > 0 && (
                    <button
                      onClick={() => setHistoryOpen(s => { const n = new Set(s); n.has(account.id) ? n.delete(account.id) : n.add(account.id); return n })}
                      className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg px-2.5 py-1.5"
                    >
                      <History size={12} /> History
                      <span className="text-gray-400">{historyByAccount.get(account.id)!.length}</span>
                    </button>
                  )}
                  {dirty && (
                    <button
                      onClick={() => saveAccount(account)}
                      disabled={savingId === account.id}
                      className="flex items-center gap-1.5 text-xs font-medium bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 ml-auto"
                    >
                      <Save size={12} />
                      {savingId === account.id ? 'Saving…' : 'Save'}
                    </button>
                  )}
                </div>

                {/* Balance history */}
                {historyOpen.has(account.id) && (historyByAccount.get(account.id)?.length ?? 0) > 0 && (
                  <div className="mt-3 border-t border-gray-100 pt-3">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Balance history</p>
                    <div className="space-y-1">
                      {historyByAccount.get(account.id)!.map((h, i, arr) => {
                        const prev = arr[i + 1]  // chronologically earlier (list is newest-first)
                        const delta = prev ? h.balance - prev.balance : null
                        return (
                          <div key={h.id} className="flex items-center gap-2 text-xs py-1 border-b border-gray-50 last:border-0">
                            <span className="text-gray-500 w-20 shrink-0">{fmtDate(h.as_of_date)}</span>
                            <span className="font-medium text-gray-800 w-24 shrink-0 text-right">{Math.round(h.balance).toLocaleString()}</span>
                            <span className={`w-20 shrink-0 text-right ${delta == null ? 'text-gray-300' : delta < 0 ? 'text-red-500' : delta > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                              {delta == null ? '—' : `${delta > 0 ? '+' : ''}${Math.round(delta).toLocaleString()}`}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 capitalize ${h.source === 'reconcile' ? 'bg-indigo-50 text-indigo-500' : 'bg-gray-100 text-gray-500'}`}>{h.source}</span>
                            <span className="flex-1" />
                            <button onClick={() => deleteSnapshot(h.id)} title="Delete snapshot" className="text-gray-300 hover:text-red-500 shrink-0"><Trash2 size={12} /></button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add balance modal */}
      {addOpen && (
        <Modal title="Add a miles balance" onClose={() => setAddOpen(false)}>
          <div className="space-y-4">
            <div>
              <label className="label">Name</label>
              <input
                autoFocus
                value={addName}
                onChange={e => setAddName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') submitAddBalance() }}
                placeholder="e.g. KrisFlyer miles"
                className="input"
              />
              <p className="text-xs text-gray-500 mt-1">A standalone balance not tied to a card — set its opening balance and log redemptions after.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setAddOpen(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={submitAddBalance} className="btn-primary flex-1">Add balance</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reconcile confirmation modal */}
      {reconcileFor && (
        <Modal title="Reconcile balance" onClose={() => setReconcileFor(null)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Set <span className="font-semibold text-gray-900">"{reconcileFor.name}"</span> opening balance to its current
              total of{' '}
              <span className="font-semibold text-indigo-600">
                {Math.round(reconcileFor.opening_miles + earnedFor(reconcileFor) + adjSum(reconcileFor)).toLocaleString()} miles
              </span>{' '}
              as of today ({fmtDate(today())}), and start counting earned miles and adjustments fresh from now.
            </p>
            <p className="text-xs text-gray-500">Your redemption history is kept. Use this when your numbers have drifted from your bank's.</p>
            <div className="flex gap-3">
              <button onClick={() => setReconcileFor(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={confirmReconcile} className="btn-primary flex-1">Reconcile</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete balance confirmation modal */}
      {accToDelete && (
        <Modal title="Remove balance" onClose={() => setAccToDelete(null)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Remove <span className="font-semibold text-gray-900">"{accToDelete.name}"</span>? This deletes its opening
              balance and adjustment history. It won't affect any transactions you've logged.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setAccToDelete(null)} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={confirmDeleteAccount}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg py-2 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
