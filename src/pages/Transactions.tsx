import { useState, useMemo } from 'react'
import { Plus, Trash2, ChevronDown, Sparkles } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import StatusBadge from '../components/StatusBadge'
import { supabase } from '../lib/supabase'
import { recommendCards, calcMiles } from '../lib/recommendations'
import { isoDate } from '../lib/utils'
import { TransactionFormData, CardRecommendation } from '../lib/types'

const EMPTY_FORM: TransactionFormData = {
  card_id: '',
  category_id: '',
  amount: '',
  description: '',
  transaction_date: isoDate(),
}

export default function Transactions() {
  const { cards, categories, rates, caps, transactions, overrides, refreshTransactions } = useApp()
  const { user } = useAuth()

  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<TransactionFormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [filterMonth, setFilterMonth] = useState(isoDate().slice(0, 7))
  const [filterCat, setFilterCat] = useState('')
  const [filterCard, setFilterCard] = useState('')

  // Recommendations live while filling form — uses transaction_date for effective rate lookup
  const recs = useMemo<CardRecommendation[]>(() => {
    const amt = parseFloat(form.amount)
    if (!form.category_id || isNaN(amt) || amt <= 0) return []
    const txDate = form.transaction_date ? new Date(form.transaction_date) : new Date()
    return recommendCards(cards, rates, caps, form.category_id, amt, transactions, txDate, overrides)
  }, [form.category_id, form.amount, form.transaction_date, cards, rates, caps, transactions, overrides])

  const bestCardId = recs[0]?.card.id ?? ''

  function setField(k: keyof TransactionFormData, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function openAdd() {
    setForm(EMPTY_FORM)
    setError(null)
    setShowModal(true)
  }

  async function handleSave() {
    const amount = parseFloat(form.amount)
    if (!form.card_id || !form.category_id || isNaN(amount) || amount <= 0) {
      setError('Card, category, and a valid amount are required.')
      return
    }
    setSaving(true)
    setError(null)

    const card = cards.find(c => c.id === form.card_id)!
    const txDate = form.transaction_date ? new Date(form.transaction_date) : new Date()
    const { miles, effectiveMpd } = calcMiles(card, rates, caps, form.category_id, amount, transactions, txDate, overrides)

    const { error: dbErr } = await supabase.from('transactions').insert({
      card_id: form.card_id,
      category_id: form.category_id,
      amount,
      description: form.description || null,
      transaction_date: form.transaction_date,
      miles_earned: Math.round(miles),
      effective_mpd: parseFloat(effectiveMpd.toFixed(2)),
      user_id: user!.id,
    })

    setSaving(false)
    if (dbErr) { setError(dbErr.message); return }
    setShowModal(false)
    refreshTransactions()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this transaction?')) return
    await supabase.from('transactions').delete().eq('id', id)
    refreshTransactions()
  }

  // Filtered transactions
  const filtered = useMemo(() => {
    return transactions.filter(t => {
      if (filterMonth && !t.transaction_date.startsWith(filterMonth)) return false
      if (filterCat && t.category_id !== filterCat) return false
      if (filterCard && t.card_id !== filterCard) return false
      return true
    })
  }, [transactions, filterMonth, filterCat, filterCard])

  const totalMiles = filtered.reduce((s, t) => s + (t.miles_earned ?? 0), 0)
  const totalSpent = filtered.reduce((s, t) => s + t.amount, 0)

  // Build month options from available transactions
  const months = useMemo(() => {
    const set = new Set(transactions.map(t => t.transaction_date.slice(0, 7)))
    const now = isoDate().slice(0, 7)
    set.add(now)
    return Array.from(set).sort().reverse()
  }, [transactions])

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <button onClick={openAdd} className="btn-primary">
          <Plus size={16} /> Log Transaction
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative">
          <select
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
            className="input w-36 appearance-none pr-7 text-sm"
          >
            {months.map(m => (
              <option key={m} value={m}>
                {new Date(m + '-01').toLocaleDateString('en-SG', { month: 'short', year: 'numeric' })}
              </option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={filterCat}
            onChange={e => setFilterCat(e.target.value)}
            className="input w-40 appearance-none pr-7 text-sm"
          >
            <option value="">All categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={filterCard}
            onChange={e => setFilterCard(e.target.value)}
            className="input w-48 appearance-none pr-7 text-sm"
          >
            <option value="">All cards</option>
            {cards.map(c => (
              <option key={c.id} value={c.id}>{c.bank} {c.name}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        <div className="ml-auto flex gap-4 items-center text-sm text-gray-500">
          <span>S${totalSpent.toFixed(2)} spent</span>
          <span className="text-indigo-600 font-medium">+{Math.round(totalMiles).toLocaleString()} miles</span>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">No transactions found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Description</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Category</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Card</th>
                <th className="text-right px-4 py-3">Amount</th>
                <th className="text-right px-4 py-3 hidden sm:table-cell">Miles</th>
                <th className="text-right px-4 py-3 hidden md:table-cell">MPD</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(t => {
                const card = cards.find(c => c.id === t.card_id)
                const cat = categories.find(c => c.id === t.category_id)
                return (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{t.transaction_date}</td>
                    <td className="px-4 py-3 text-gray-800 max-w-[160px] truncate">
                      {t.description || cat?.name || '—'}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-gray-500">
                      {cat ? `${cat.icon} ${cat.name}` : '—'}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {card ? (
                        <span className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: card.color }}
                          />
                          <span className="text-gray-700 truncate max-w-[140px]">{card.bank} {card.name}</span>
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800">
                      S${t.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell">
                      {t.miles_earned != null
                        ? <span className="text-indigo-600 font-medium">+{Math.round(t.miles_earned).toLocaleString()}</span>
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right hidden md:table-cell text-gray-400 text-xs">
                      {t.effective_mpd != null ? `${t.effective_mpd} mpd` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="text-gray-300 hover:text-red-500 transition-colors p-1 rounded"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add modal */}
      {showModal && (
        <Modal title="Log Transaction" onClose={() => setShowModal(false)}>
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={form.transaction_date}
              onChange={e => setField('transaction_date', e.target.value)} />
          </div>

          <div>
            <label className="label">Category</label>
            <div className="relative">
              <select
                value={form.category_id}
                onChange={e => setField('category_id', e.target.value)}
                className="input appearance-none pr-8"
              >
                <option value="">Select category…</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="label">Amount (S$)</label>
            <input type="number" min="0" step="0.01" placeholder="0.00" className="input"
              value={form.amount} onChange={e => setField('amount', e.target.value)} />
          </div>

          {/* Live recommendation */}
          {recs.length > 0 && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 space-y-1.5">
              <p className="text-xs font-semibold text-indigo-700 flex items-center gap-1">
                <Sparkles size={12} /> Recommendation
              </p>
              {recs.slice(0, 3).map((rec, i) => (
                <button
                  key={rec.card.id}
                  type="button"
                  onClick={() => setField('card_id', rec.card.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                    form.card_id === rec.card.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white hover:bg-indigo-100 text-gray-700'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: rec.card.color }}
                  />
                  <span className="flex-1 truncate">
                    {i === 0 && '⭐ '}{rec.card.bank} {rec.card.name}
                  </span>
                  <StatusBadge status={rec.status} />
                  <span className="font-semibold whitespace-nowrap">
                    {rec.effectiveMpd.toFixed(2)} mpd
                  </span>
                </button>
              ))}
              {form.card_id === '' && bestCardId && (
                <p className="text-xs text-indigo-500 pl-1">
                  Tap a card above to select it, or choose below.
                </p>
              )}
            </div>
          )}

          <div>
            <label className="label">Card Used</label>
            <div className="relative">
              <select
                value={form.card_id}
                onChange={e => setField('card_id', e.target.value)}
                className="input appearance-none pr-8"
              >
                <option value="">Select card…</option>
                {cards.map(c => (
                  <option key={c.id} value={c.id}>{c.bank} {c.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="label">Description (optional)</label>
            <input type="text" placeholder="e.g. Grab Food, NTUC…" className="input"
              value={form.description} onChange={e => setField('description', e.target.value)} />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving…' : 'Save Transaction'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
