import { useEffect, useMemo, useState } from 'react'
import {
  Award, AlertTriangle, AlertCircle, CalendarClock, Save, Plus, X, Layers, RotateCcw, Trash2, ChevronDown, ChevronRight, Pencil, HelpCircle, Infinity as InfinityIcon,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { MilesAccount, MilesAccountCard, MilesAdjustment } from '../lib/types'

interface EarnRow { card_id: string | null; miles_earned: number | null; transaction_date: string }

function today() {
  return new Date().toISOString().slice(0, 10)
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

  const [accounts, setAccounts] = useState<MilesAccount[]>([])
  const [links, setLinks] = useState<MilesAccountCard[]>([])
  const [adjustments, setAdjustments] = useState<MilesAdjustment[]>([])
  const [earn, setEarn] = useState<EarnRow[]>([])
  const [loading, setLoading] = useState(true)

  // Per-account UI state
  const [drafts, setDrafts] = useState<Record<string, { name: string; opening: string; asOf: string; expiry: string }>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [ledgerOpen, setLedgerOpen] = useState<Set<string>>(new Set())
  const [adjFormFor, setAdjFormFor] = useState<string | null>(null)
  const [adjDraft, setAdjDraft] = useState({ date: today(), miles: '', type: 'redeem' as 'redeem' | 'bonus', note: '' })
  const [addCardFor, setAddCardFor] = useState<string | null>(null)
  const [helpOpen, setHelpOpen] = useState(() => localStorage.getItem('milesHelpCollapsed') !== '1')

  function toggleHelp() {
    setHelpOpen(o => { localStorage.setItem('milesHelpCollapsed', o ? '1' : '0'); return !o })
  }

  const milesCards = useMemo(() => cards.filter(c => c.card_type === 'miles'), [cards])
  const cardById = useMemo(() => new Map(cards.map(c => [c.id, c])), [cards])

  useEffect(() => {
    if (milesCards.length > 0) reload()
    else setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [milesCards.length])

  async function reload() {
    const [accRes, linkRes, adjRes, earnRes] = await Promise.all([
      supabase.from('miles_accounts').select('*').order('name'),
      supabase.from('miles_account_cards').select('*'),
      supabase.from('miles_adjustments').select('*').order('adjustment_date', { ascending: false }),
      supabase.from('transactions').select('card_id, miles_earned, transaction_date'),
    ])
    let acc = (accRes.data as MilesAccount[]) ?? []
    let lnk = (linkRes.data as MilesAccountCard[]) ?? []

    // Auto-create a pool-of-one account for any wallet miles card not yet linked.
    const linked = new Set(lnk.map(l => l.card_id))
    const orphans = milesCards.filter(c => !linked.has(c.id))
    if (orphans.length > 0) {
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
        }
      }
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
    const nameUpdates: Promise<unknown>[] = []
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
    setLoading(false)
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
    reload()
  }

  // ---- reconcile: set opening = current total, as-of = today, clears running drift ----
  async function reconcile(a: MilesAccount) {
    const total = a.opening_miles + earnedFor(a) + adjSum(a)
    const ok = window.confirm(
      `Reconcile "${a.name}"?\n\n` +
      `This sets the opening balance to your current total of ${total.toLocaleString()} miles, ` +
      `as of today (${fmtDate(today())}), and starts counting earned miles and adjustments fresh from now.\n\n` +
      `Your redemption history is kept. Use this when your numbers have drifted from your bank's.`
    )
    if (!ok) return
    await supabase.from('miles_accounts').update({
      opening_miles: total,
      as_of_date: today(),
      updated_at: new Date().toISOString(),
    }).eq('id', a.id)
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

  if (loading) return <p className="text-sm text-gray-400 p-4">Loading…</p>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Award size={22} className="text-indigo-500" />
          Miles Balance
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Track how many miles you hold on each card, and when they expire.
        </p>
      </div>

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

      {milesCards.length === 0 ? (
        <div className="card p-10 text-center text-gray-400 text-sm border-dashed border-2 border-gray-200">
          No miles cards in your wallet yet. Add cards in My Cards first.
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
                              className="text-gray-400 hover:text-red-500"
                            >
                              <X size={11} />
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-2xl font-bold text-indigo-600">{total.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">total miles</p>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-gray-50 rounded-lg p-2.5">
                    <p className="text-xs text-gray-500 mb-1">Opening</p>
                    <input
                      type="number" step="100" min="0"
                      value={d.opening}
                      onChange={e => setDraft(account.id, { opening: e.target.value })}
                      className="input text-sm py-1 w-full"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">
                      as of <input
                        type="date"
                        value={d.asOf}
                        onChange={e => setDraft(account.id, { asOf: e.target.value })}
                        className="bg-transparent text-[11px] text-gray-500 focus:outline-none"
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

                {/* Expiry */}
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="text-xs text-gray-500 shrink-0">Expiry</label>
                  <input
                    type="date"
                    value={d.expiry}
                    onChange={e => setDraft(account.id, { expiry: e.target.value })}
                    className="input text-xs py-1 w-36"
                  />
                  {d.expiry ? (
                    <>
                      <ExpiryBadge dateStr={d.expiry} />
                      <button
                        onClick={() => setDraft(account.id, { expiry: '' })}
                        className="text-xs text-gray-400 hover:text-gray-600 underline"
                      >
                        Set no expiry
                      </button>
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-400">
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
                        <input
                          type="date" value={adjDraft.date}
                          onChange={e => setAdjDraft(p => ({ ...p, date: e.target.value }))}
                          className="input text-xs py-1 w-32"
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
                            <span className="text-gray-400 w-20 shrink-0">{fmtDate(adj.adjustment_date)}</span>
                            <span className={`font-medium w-20 shrink-0 ${adj.miles < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                              {adj.miles > 0 ? '+' : ''}{adj.miles.toLocaleString()}
                            </span>
                            <span className="text-gray-600 flex-1 truncate">
                              {adj.note ?? '—'}{bakedIn && <span className="text-gray-400"> · in opening</span>}
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
                        <div className="absolute z-10 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[180px]">
                          {otherCards.map(c => (
                            <button
                              key={c.id}
                              onClick={() => moveCardToAccount(c.id, account.id)}
                              className="block w-full text-left text-xs px-3 py-1.5 hover:bg-gray-50 text-gray-700"
                            >
                              {c.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <button
                    onClick={() => reconcile(account)}
                    title="Re-baseline: set opening to your current total as of today. Use when your numbers drift from the bank's."
                    className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg px-2.5 py-1.5"
                  >
                    <RotateCcw size={12} /> Reconcile
                  </button>
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
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
