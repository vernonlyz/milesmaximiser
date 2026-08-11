import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bug, Lightbulb, CheckCircle, Circle, RefreshCw, Download, Tag, ChevronDown } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import { exportCsv } from '../lib/utils'
import { resolveOverride } from '../lib/recommendations'
import { CardExportAlias } from '../lib/types'

const ADMIN_EMAIL = 'vernonlyz@gmail.com'

interface FeedbackRow {
  id: string
  user_email: string | null
  type: 'bug' | 'suggestion'
  message: string
  status: 'open' | 'resolved'
  created_at: string
}

type Filter = 'all' | 'open' | 'resolved'

function currentMonth() {
  return new Date().toISOString().slice(0, 7)
}

function toDisplayDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export default function Admin() {
  const { user } = useAuth()
  const { categories, cards, allCards, transactions, overrides } = useApp()
  const navigate = useNavigate()

  const [rows, setRows] = useState<FeedbackRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('open')
  const [toggling, setToggling] = useState<string | null>(null)
  const [exportMonth, setExportMonth] = useState(currentMonth)
  const [aliases, setAliases] = useState<CardExportAlias[]>([])
  const [aliasDrafts, setAliasDrafts] = useState<Record<string, string>>({})
  const [aliasEditorOpen, setAliasEditorOpen] = useState(false)

  useEffect(() => {
    if (user?.email !== ADMIN_EMAIL) {
      navigate('/')
      return
    }
    load()
    loadAliases()
  }, [user])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false })
    setRows((data as FeedbackRow[]) ?? [])
    setLoading(false)
  }

  const aliasKey = (cardId: string, catId: string | null) => `${cardId}:${catId ?? ''}`

  async function loadAliases() {
    const { data } = await supabase.from('card_export_aliases').select('*')
    const list = (data as CardExportAlias[]) ?? []
    setAliases(list)
    setAliasDrafts(Object.fromEntries(list.map(a => [aliasKey(a.card_id, a.category_id), a.alias])))
  }

  async function saveAlias(cardId: string, catId: string | null, raw: string) {
    const value = raw.trim()
    const existing = aliases.find(a => a.card_id === cardId && (a.category_id ?? null) === catId)
    if (!value) {
      if (existing) await supabase.from('card_export_aliases').delete().eq('id', existing.id)
    } else if (existing) {
      if (existing.alias === value) return
      await supabase.from('card_export_aliases').update({ alias: value }).eq('id', existing.id)
    } else {
      await supabase.from('card_export_aliases').insert({ user_id: user!.id, card_id: cardId, category_id: catId, alias: value })
    }
    await loadAliases()
  }

  // Cards used in transactions (so the editor lists what actually gets exported),
  // plus any wallet card, deduped and sorted.
  const aliasCards = useMemo(() => {
    const usedIds = new Set(transactions.map(t => t.card_id).filter(Boolean) as string[])
    const byId = new Map(allCards.map(c => [c.id, c]))
    const walletIds = new Set(cards.map(c => c.id))
    const ids = new Set<string>([...walletIds, ...usedIds])
    return Array.from(ids).map(id => byId.get(id)).filter((c): c is typeof allCards[number] => !!c)
      .sort((a, b) => `${a.bank} ${a.name}`.localeCompare(`${b.bank} ${b.name}`))
  }, [cards, allCards, transactions])

  async function toggleStatus(row: FeedbackRow) {
    setToggling(row.id)
    const next = row.status === 'open' ? 'resolved' : 'open'
    await supabase.from('feedback').update({ status: next }).eq('id', row.id)
    setRows(prev => prev.map(r => r.id === row.id ? { ...r, status: next } : r))
    window.dispatchEvent(new Event('feedback-status-changed'))
    setToggling(null)
  }

  function handleExport() {
    // All data already loaded in AppContext — no Supabase query needed
    const catMap  = new Map(categories.map(c => [c.id, c.name]))
    const cardMap = new Map(allCards.map(c => [c.id, `${c.bank} ${c.name}`]))
    // Card Used = alias for (card, category) → card default alias → "Bank Name".
    const aliasMap = new Map(aliases.map(a => [aliasKey(a.card_id, a.category_id), a.alias]))
    const aliasFor = (cardId: string, catId: string | null) =>
      aliasMap.get(aliasKey(cardId, catId)) ?? aliasMap.get(aliasKey(cardId, null)) ?? cardMap.get(cardId) ?? ''

    let filtered = transactions
    if (exportMonth) {
      const [y, m] = exportMonth.split('-').map(Number)
      const nextM = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`
      filtered = transactions.filter(t =>
        t.transaction_date >= `${exportMonth}-01` && t.transaction_date < nextM
      )
    }

    const headers = ['Category', 'Vendor', 'Notes', 'Date', 'Date', 'Amount', 'Personal Expense', 'Card Used']
    const csvRows = filtered.map(t => [
      catMap.get(t.category_id ?? '') ?? '',
      t.vendor_name ?? '',
      t.description ?? '',
      toDisplayDate(t.transaction_date),
      toDisplayDate(t.transaction_date),
      t.amount,
      t.personal_amount ?? t.amount,
      aliasFor(t.card_id ?? '', t.category_id ?? null),
    ])

    const filename = exportMonth
      ? `smilemax_${exportMonth}.csv`
      : 'smilemax_all_transactions.csv'
    exportCsv(filename, headers, csvRows)
  }

  const displayed    = rows.filter(r => filter === 'all' || r.status === filter)
  const openCount    = rows.filter(r => r.status === 'open').length
  const resolvedCount = rows.filter(r => r.status === 'resolved').length

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Feedback</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {openCount} open · {resolvedCount} resolved
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Export card */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <Download size={15} className="text-indigo-500 shrink-0" />
        <span className="text-sm font-medium text-gray-700 shrink-0">Export Transactions</span>
        <div className="flex items-center gap-2 flex-wrap flex-1">
          <input
            type="month"
            value={exportMonth}
            max={currentMonth()}
            onChange={e => setExportMonth(e.target.value)}
            className="input text-sm py-1 w-40"
          />
          {exportMonth && (
            <button
              onClick={() => setExportMonth('')}
              className="text-xs text-gray-500 hover:text-gray-600 transition-colors"
            >
              All time
            </button>
          )}
        </div>
        <button
          onClick={handleExport}
          className="btn-primary text-sm py-1.5 shrink-0"
        >
          Export CSV
        </button>
      </div>

      {/* Card export names (aliases used in the CSV "Card Used" column) */}
      <div className="card p-4">
        <button
          onClick={() => setAliasEditorOpen(o => !o)}
          className="flex items-center gap-2 w-full text-sm font-medium text-gray-700"
        >
          <Tag size={15} className="text-indigo-500 shrink-0" />
          Card export names
          <span className="text-xs text-gray-400 font-normal">{aliases.length} set</span>
          <ChevronDown size={16} className={`ml-auto text-gray-400 transition-transform ${aliasEditorOpen ? '' : '-rotate-90'}`} />
        </button>
        {aliasEditorOpen && (
          <div className="mt-3 space-y-3">
            <p className="text-xs text-gray-500">
              Rename how each card appears in the exported <b>Card Used</b> column. Leave blank to use the default “Bank Name”.
              Selectable cards (e.g. UOB Lady’s) can also set a name per chosen bonus category. Saved automatically.
            </p>
            {aliasCards.map(card => {
              const fullName = `${card.bank} ${card.name}`
              const chosen = card.selectable_category ? (resolveOverride(overrides, card.id) ?? []) : []
              return (
                <div key={card.id} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: card.color }} />
                    <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">{fullName}</span>
                    <input
                      value={aliasDrafts[aliasKey(card.id, null)] ?? ''}
                      onChange={e => setAliasDrafts(d => ({ ...d, [aliasKey(card.id, null)]: e.target.value }))}
                      onBlur={e => saveAlias(card.id, null, e.target.value)}
                      placeholder={fullName}
                      className="input text-sm w-40 shrink-0"
                    />
                  </div>
                  {chosen.map(catId => {
                    const catName = categories.find(c => c.id === catId)?.name ?? '—'
                    return (
                      <div key={catId} className="flex items-center gap-2 pl-5">
                        <span className="text-xs text-gray-400 flex-1 min-w-0 truncate">↳ {catName}</span>
                        <input
                          value={aliasDrafts[aliasKey(card.id, catId)] ?? ''}
                          onChange={e => setAliasDrafts(d => ({ ...d, [aliasKey(card.id, catId)]: e.target.value }))}
                          onBlur={e => saveAlias(card.id, catId, e.target.value)}
                          placeholder={`${fullName} · ${catName}`}
                          className="input text-sm w-40 shrink-0"
                        />
                      </div>
                    )
                  })}
                </div>
              )
            })}
            {aliasCards.length === 0 && <p className="text-sm text-gray-500">No cards yet.</p>}
          </div>
        )}
      </div>

      {/* Feedback filter tabs */}
      <div className="flex gap-2">
        {(['open', 'resolved', 'all'] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
              filter === f
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : displayed.length === 0 ? (
        <div className="card p-10 text-center text-gray-500 text-sm border-dashed border-2 border-gray-200">
          No {filter === 'all' ? '' : filter} feedback yet.
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(row => (
            <div
              key={row.id}
              className={`card p-4 transition-opacity ${row.status === 'resolved' ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start gap-3">
                <div className={`shrink-0 mt-0.5 p-1.5 rounded-lg ${
                  row.type === 'bug' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'
                }`}>
                  {row.type === 'bug' ? <Bug size={14} /> : <Lightbulb size={14} />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      row.type === 'bug'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {row.type === 'bug' ? 'Bug report' : 'Suggestion'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {row.user_email ?? 'Anonymous'} · {new Date(row.created_at).toLocaleDateString('en-SG', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-gray-700 whitespace-pre-wrap">{row.message}</p>
                </div>

                <button
                  onClick={() => toggleStatus(row)}
                  disabled={toggling === row.id}
                  title={row.status === 'open' ? 'Mark as resolved' : 'Reopen'}
                  className="shrink-0 text-gray-300 hover:text-emerald-500 transition-colors disabled:opacity-40"
                >
                  {row.status === 'resolved'
                    ? <CheckCircle size={20} className="text-emerald-500" />
                    : <Circle size={20} />
                  }
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
