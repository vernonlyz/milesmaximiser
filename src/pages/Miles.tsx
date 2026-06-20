import { useEffect, useState } from 'react'
import { Award, AlertTriangle, AlertCircle, CalendarClock, Save } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

interface MilesBalance {
  card_id: string
  opening_miles: number
  expiry_date: string | null
}

function monthsUntil(dateStr: string): number {
  const expiry = new Date(dateStr)
  const now = new Date()
  return (expiry.getFullYear() - now.getFullYear()) * 12 + (expiry.getMonth() - now.getMonth())
}

function ExpiryBadge({ dateStr }: { dateStr: string }) {
  const months = monthsUntil(dateStr)
  const display = new Date(dateStr).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })

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
        <AlertTriangle size={11} /> Expiring {display}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
      <CalendarClock size={11} /> Expires {display}
    </span>
  )
}

export default function Miles() {
  const { cards } = useApp()
  const { user } = useAuth()

  const [balances, setBalances] = useState<Record<string, MilesBalance>>({})
  const [earned, setEarned] = useState<Record<string, number>>({})
  const [drafts, setDrafts] = useState<Record<string, { opening: string; expiry: string }>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const milesCards = cards.filter(c => c.card_type === 'miles')

  useEffect(() => {
    Promise.all([loadBalances(), loadEarned()]).finally(() => setLoading(false))
  }, [])

  async function loadBalances() {
    const { data } = await supabase.from('miles_balances').select('card_id, opening_miles, expiry_date')
    const map: Record<string, MilesBalance> = {}
    for (const row of (data ?? []) as MilesBalance[]) map[row.card_id] = row
    setBalances(map)
  }

  async function loadEarned() {
    const { data } = await supabase.from('transactions').select('card_id, miles_earned')
    const map: Record<string, number> = {}
    for (const t of (data ?? []) as { card_id: string | null; miles_earned: number | null }[]) {
      if (t.card_id && t.miles_earned) map[t.card_id] = (map[t.card_id] ?? 0) + t.miles_earned
    }
    setEarned(map)
  }

  function getDraft(cardId: string) {
    if (drafts[cardId]) return drafts[cardId]
    const b = balances[cardId]
    return { opening: String(b?.opening_miles ?? 0), expiry: b?.expiry_date ?? '' }
  }

  function setDraft(cardId: string, field: 'opening' | 'expiry', value: string) {
    setDrafts(prev => ({
      ...prev,
      [cardId]: { ...getDraft(cardId), [field]: value },
    }))
  }

  function isDirty(cardId: string) {
    const d = getDraft(cardId)
    const b = balances[cardId]
    return (
      parseInt(d.opening || '0') !== (b?.opening_miles ?? 0) ||
      (d.expiry || null) !== (b?.expiry_date ?? null)
    )
  }

  async function handleSave(cardId: string) {
    const d = getDraft(cardId)
    setSaving(cardId)
    await supabase.from('miles_balances').upsert(
      {
        user_id: user!.id,
        card_id: cardId,
        opening_miles: parseInt(d.opening || '0') || 0,
        expiry_date: d.expiry || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,card_id' }
    )
    await loadBalances()
    setDrafts(prev => { const next = { ...prev }; delete next[cardId]; return next })
    setSaving(null)
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
          Track your miles across wallet cards. Set an opening balance and expiry date per card.
        </p>
      </div>

      {milesCards.length === 0 ? (
        <div className="card p-10 text-center text-gray-400 text-sm border-dashed border-2 border-gray-200">
          No miles cards in your wallet yet. Add cards in My Cards first.
        </div>
      ) : (
        <div className="space-y-3">
          {milesCards.map(card => {
            const draft = getDraft(card.id)
            const earnedMiles = Math.round(earned[card.id] ?? 0)
            const openingMiles = parseInt(draft.opening || '0') || 0
            const total = openingMiles + earnedMiles
            const dirty = isDirty(card.id)
            const isSaving = saving === card.id

            return (
              <div key={card.id} className="card p-5 space-y-4">
                {/* Card header */}
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: card.color ?? '#6366f1' }}
                  >
                    {card.bank.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{card.name}</p>
                    <p className="text-xs text-gray-400">{card.bank}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-2xl font-bold text-indigo-600">{total.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">total miles</p>
                  </div>
                </div>

                {/* Miles breakdown */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Opening balance</p>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={draft.opening}
                      onChange={e => setDraft(card.id, 'opening', e.target.value)}
                      placeholder="0"
                      className="input text-sm py-1 w-full"
                    />
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">App-tracked (all time)</p>
                    <p className="text-sm font-semibold text-gray-800 pt-1.5">{earnedMiles.toLocaleString()} miles</p>
                  </div>
                </div>

                {/* Expiry row */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <label className="text-xs text-gray-500 shrink-0">Expiry date</label>
                    <input
                      type="date"
                      value={draft.expiry}
                      onChange={e => setDraft(card.id, 'expiry', e.target.value)}
                      className="input text-xs py-1 w-36"
                    />
                    {draft.expiry && <ExpiryBadge dateStr={draft.expiry} />}
                    {!draft.expiry && (
                      <span className="text-xs text-gray-400">{card.mile_validity ?? 'No expiry info'}</span>
                    )}
                  </div>
                  {dirty && (
                    <button
                      onClick={() => handleSave(card.id)}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 text-xs font-medium bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 shrink-0"
                    >
                      <Save size={12} />
                      {isSaving ? 'Saving…' : 'Save'}
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
