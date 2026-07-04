import { useEffect, useMemo, useState } from 'react'
import { Coins, Save, Plus, Trash2, ChevronDown, ChevronRight, Plane, FlaskConical } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { supabase } from '../lib/supabase'
import { RewardProgram, CardRewardProgram, PointsAccount, PointsAdjustment } from '../lib/types'
import MilesTabs from '../components/MilesTabs'
import DatePicker from '../components/DatePicker'

interface EarnRow { card_id: string | null; miles_earned: number | null; transaction_date: string }

function today() {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
}
const fmtNum = (n: number) => Math.round(n).toLocaleString('en-SG')

export default function Points() {
  const { cards } = useApp()
  const { user } = useAuth()
  const toast = useToast()

  const [programs, setPrograms] = useState<RewardProgram[]>([])
  const [mapping, setMapping] = useState<CardRewardProgram[]>([])
  const [accounts, setAccounts] = useState<PointsAccount[]>([])
  const [adjustments, setAdjustments] = useState<PointsAdjustment[]>([])
  const [earn, setEarn] = useState<EarnRow[]>([])
  const [loading, setLoading] = useState(true)

  const [drafts, setDrafts] = useState<Record<string, { opening: string; asOf: string; expiry: string }>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [ledgerOpen, setLedgerOpen] = useState<Set<string>>(new Set())
  const [adjFormFor, setAdjFormFor] = useState<string | null>(null)
  const [adjDraft, setAdjDraft] = useState({ date: today(), points: '', type: 'redeem' as 'redeem' | 'bonus', note: '' })

  // Programs the user actually earns into (at least one wallet card mapped to them).
  const walletProgramIds = useMemo(() => {
    const walletCardIds = new Set(cards.map(c => c.id))
    const ids = new Set<string>()
    for (const m of mapping) if (walletCardIds.has(m.card_id)) ids.add(m.program_id)
    return ids
  }, [cards, mapping])

  async function load() {
    setLoading(true)
    const [progRes, mapRes, acctRes, adjRes, earnRes] = await Promise.all([
      supabase.from('reward_programs').select('*').order('name'),
      supabase.from('card_reward_program').select('*'),
      supabase.from('points_accounts').select('*'),
      supabase.from('points_adjustments').select('*').order('adjustment_date', { ascending: false }),
      supabase.from('transactions').select('card_id, miles_earned, transaction_date'),
    ])

    const progs = (progRes.data as RewardProgram[]) ?? []
    const map = (mapRes.data as CardRewardProgram[]) ?? []
    let accts = (acctRes.data as PointsAccount[]) ?? []

    // Ensure one account per program the user earns into (lazy create, opening 0).
    const walletCardIds = new Set(cards.map(c => c.id))
    const relevant = new Set<string>()
    for (const m of map) if (walletCardIds.has(m.card_id)) relevant.add(m.program_id)
    const missing = [...relevant].filter(pid => !accts.some(a => a.program_id === pid))
    if (missing.length && user) {
      await supabase.from('points_accounts').insert(
        missing.map(pid => ({ user_id: user.id, program_id: pid, opening_points: 0, as_of_date: today() }))
      )
      accts = ((await supabase.from('points_accounts').select('*')).data as PointsAccount[]) ?? accts
    }

    setPrograms(progs)
    setMapping(map)
    setAccounts(accts)
    setAdjustments((adjRes.data as PointsAdjustment[]) ?? [])
    setEarn((earnRes.data as EarnRow[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { if (user) load() }, [user, cards.length])

  // Points earned since the snapshot = Σ(miles_earned ÷ miles_per_point) for the
  // program's cards, for transactions dated after as_of_date.
  function computeBalance(prog: RewardProgram, acct: PointsAccount) {
    const cardIds = new Set(mapping.filter(m => m.program_id === prog.id).map(m => m.card_id))
    let earned = 0
    for (const t of earn) {
      if (t.card_id && cardIds.has(t.card_id) && t.miles_earned && t.transaction_date > acct.as_of_date) {
        earned += t.miles_earned / prog.miles_per_point
      }
    }
    const adj = adjustments
      .filter(a => a.account_id === acct.id && a.adjustment_date > acct.as_of_date)
      .reduce((s, a) => s + a.points, 0)
    const balance = acct.opening_points + earned + adj
    return { earned, adj, balance }
  }

  const rows = useMemo(() => {
    return programs
      .filter(p => walletProgramIds.has(p.id))
      .map(prog => {
        const acct = accounts.find(a => a.program_id === prog.id)
        if (!acct) return null
        const { earned, adj, balance } = computeBalance(prog, acct)
        return { prog, acct, earned, adj, balance, milesEquiv: balance * prog.miles_per_point }
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
  }, [programs, accounts, adjustments, earn, walletProgramIds, mapping])

  const totalMilesEquiv = rows.reduce((s, r) => s + r.milesEquiv, 0)

  function draftFor(a: PointsAccount) {
    return drafts[a.id] ?? { opening: String(a.opening_points), asOf: a.as_of_date, expiry: a.expiry_date ?? '' }
  }
  function setDraft(id: string, patch: Partial<{ opening: string; asOf: string; expiry: string }>) {
    setDrafts(d => ({ ...d, [id]: { ...draftFor(accounts.find(a => a.id === id)!), ...d[id], ...patch } }))
  }
  function dirty(a: PointsAccount) {
    const d = draftFor(a)
    return d.opening !== String(a.opening_points) || d.asOf !== a.as_of_date || (d.expiry || null) !== a.expiry_date
  }

  async function saveSnapshot(a: PointsAccount) {
    const d = draftFor(a)
    setSavingId(a.id)
    await supabase.from('points_accounts').update({
      opening_points: parseInt(d.opening) || 0,
      as_of_date: d.asOf,
      expiry_date: d.expiry || null,
      updated_at: new Date().toISOString(),
    }).eq('id', a.id)
    setSavingId(null)
    setDrafts(x => { const { [a.id]: _, ...rest } = x; return rest })
    await load()
    toast('Snapshot saved')
  }

  async function addAdjustment(acctId: string) {
    const pts = parseInt(adjDraft.points) || 0
    if (!pts) return
    const signed = adjDraft.type === 'redeem' ? -Math.abs(pts) : Math.abs(pts)
    await supabase.from('points_adjustments').insert({
      account_id: acctId, user_id: user!.id, adjustment_date: adjDraft.date, points: signed, note: adjDraft.note || null,
    })
    setAdjFormFor(null)
    setAdjDraft({ date: today(), points: '', type: 'redeem', note: '' })
    await load()
    toast('Adjustment added')
  }

  async function deleteAdjustment(id: string) {
    await supabase.from('points_adjustments').delete().eq('id', id)
    await load()
  }

  return (
    <div className="space-y-5">
      <MilesTabs />

      <div className="flex items-start gap-2">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Coins size={20} className="text-indigo-600" /> Reward points
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Bank points (UNI$, DBS Points…) earned per card, and their miles value.
          </p>
        </div>
        <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
          <FlaskConical size={11} /> Experimental
        </span>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="card p-8 text-center space-y-2">
          <Coins size={28} className="text-gray-300 mx-auto" />
          <p className="text-sm text-gray-500">No reward-points cards in your wallet yet.</p>
          <p className="text-xs text-gray-400">Add a miles card whose bank awards points (mapped in the shared library).</p>
        </div>
      ) : (
        <>
          {/* Grand total — points across programs aren't additive, but their miles value is. */}
          <div className="card p-5">
            <p className="text-xs text-gray-500">Total value across {rows.length} program{rows.length > 1 ? 's' : ''}</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1 flex items-center gap-2">
              <Plane size={18} className="text-indigo-600 -rotate-45" /> ≈ {fmtNum(totalMilesEquiv)} miles
            </p>
            <p className="text-xs text-gray-400 mt-1">If all points were converted at current rates.</p>
          </div>

          <div className="space-y-3">
            {rows.map(({ prog, acct, earned, adj, balance, milesEquiv }) => {
              const d = draftFor(acct)
              const isOpen = ledgerOpen.has(acct.id)
              const accAdj = adjustments.filter(a => a.account_id === acct.id)
              return (
                <div key={prog.id} className="card p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold text-gray-900">{prog.name}</h2>
                      <p className="text-xs text-gray-500">
                        1 {prog.unit_label} = {prog.miles_per_point} miles
                        {prog.transfer_partner && <> · → {prog.transfer_partner}</>}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-semibold text-gray-900">{fmtNum(balance)} <span className="text-sm font-normal text-gray-500">{prog.unit_label}</span></p>
                      <p className="text-xs text-gray-400">≈ {fmtNum(milesEquiv)} miles</p>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 flex flex-wrap gap-x-3 gap-y-1">
                    <span>Opening {fmtNum(acct.opening_points)}</span>
                    <span>· Earned since {fmtDate(acct.as_of_date)}: +{fmtNum(earned)}</span>
                    {adj !== 0 && <span>· Adjustments {adj > 0 ? '+' : ''}{fmtNum(adj)}</span>}
                  </div>

                  {/* Snapshot editor */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    <label className="text-xs text-gray-500">
                      Opening balance
                      <input type="number" value={d.opening} onChange={e => setDraft(acct.id, { opening: e.target.value })}
                        className="input mt-0.5" />
                    </label>
                    <label className="text-xs text-gray-500">
                      As of
                      <DatePicker value={d.asOf} onChange={v => setDraft(acct.id, { asOf: v })} className="mt-0.5" />
                    </label>
                    <label className="text-xs text-gray-500">
                      Points expiry (optional)
                      <DatePicker value={d.expiry} onChange={v => setDraft(acct.id, { expiry: v })} clearable className="mt-0.5" />
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    {dirty(acct) && (
                      <button onClick={() => saveSnapshot(acct)} disabled={savingId === acct.id}
                        className="btn-primary text-xs inline-flex items-center gap-1.5">
                        <Save size={13} /> {savingId === acct.id ? 'Saving…' : 'Save snapshot'}
                      </button>
                    )}
                    <button onClick={() => setLedgerOpen(s => { const n = new Set(s); n.has(acct.id) ? n.delete(acct.id) : n.add(acct.id); return n })}
                      className="text-xs text-gray-500 hover:text-gray-700 inline-flex items-center gap-1">
                      {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />} Adjustments ({accAdj.length})
                    </button>
                  </div>

                  {isOpen && (
                    <div className="border-t border-gray-100 pt-3 space-y-2">
                      {accAdj.length === 0 && <p className="text-xs text-gray-400">No adjustments logged.</p>}
                      {accAdj.map(a => (
                        <div key={a.id} className="flex items-center gap-2 text-sm">
                          <span className={a.points < 0 ? 'text-red-600 font-medium' : 'text-emerald-600 font-medium'}>
                            {a.points > 0 ? '+' : ''}{fmtNum(a.points)}
                          </span>
                          <span className="text-gray-500 text-xs">{fmtDate(a.adjustment_date)}</span>
                          {a.note && <span className="text-gray-400 text-xs truncate">· {a.note}</span>}
                          <button onClick={() => deleteAdjustment(a.id)} className="ml-auto text-gray-300 hover:text-red-500 p-1">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}

                      {adjFormFor === acct.id ? (
                        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                          <div className="flex gap-2">
                            <select value={adjDraft.type} onChange={e => setAdjDraft(x => ({ ...x, type: e.target.value as 'redeem' | 'bonus' }))}
                              className="input text-sm">
                              <option value="redeem">Redeem / convert out (−)</option>
                              <option value="bonus">Bonus / transfer in (+)</option>
                            </select>
                            <input type="number" placeholder="Points" value={adjDraft.points}
                              onChange={e => setAdjDraft(x => ({ ...x, points: e.target.value }))} className="input text-sm w-28" />
                          </div>
                          <div className="flex gap-2">
                            <DatePicker value={adjDraft.date} onChange={v => setAdjDraft(x => ({ ...x, date: v }))} className="flex-1" />
                            <input placeholder="Note (optional)" value={adjDraft.note}
                              onChange={e => setAdjDraft(x => ({ ...x, note: e.target.value }))} className="input text-sm flex-1" />
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => addAdjustment(acct.id)} className="btn-primary text-xs">Add</button>
                            <button onClick={() => setAdjFormFor(null)} className="btn-secondary text-xs">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => { setAdjFormFor(acct.id); setAdjDraft({ date: today(), points: '', type: 'redeem', note: '' }) }}
                          className="text-xs text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1">
                          <Plus size={13} /> Add adjustment
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <p className="text-xs text-gray-400">
            Points are derived from each card's logged miles ÷ the program's conversion rate. Rates and card→program
            mappings are indicative — edit them in the shared library.
          </p>
        </>
      )}
    </div>
  )
}
